<template>
    <div class="vendor-filter">
        <div class="vendor-filter__header">
            <div class="vendor-filter__title">
                Фильтр:
                <span class="vendor-filter__name" @click="changeFilter('default')">По алфавиту</span>
                <span class="vendor-filter__name" @click="changeFilter('album')">По альбомам</span>
                <span class="vendor-filter__name" @click="changeFilter('favorite')">Избранное</span>
            </div>
        </div>
        <div v-if="!loading" class="vendor-filter__scroll-wrap">
            <div class="vendor-filter__scroll">
                <div class="vendor-filter__list" v-for="(column, index) of getCurrentList" :key="`column-key-${index}`">
                  <div class="vendor-filter__item" v-for="item of column" :key="item.title">
                    <div class="vendor-filter__letter" v-if="item.type === listItemsType.CATEGORY">{{item.title}}</div>
                    <div class="vendor-filter__photo-item" v-else>
                      <img class="vendor-filter__photo-icon" :src="item.thumbnailUrl" alt="photo.title">
                      <span class="vendor-filter__photo-name">{{item.title}}</span>
                      <div class="vendor-filter__btn-control">
                        <div class="vendor-filter__btn" @click="removeFavorites(item)" v-show="item.favorite">X</div>
                        <div class="vendor-filter__btn" @click="addFavorites(item)" v-show="!item.favorite">❤</div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
        </div>
        <div v-else></div>
    </div>
</template>

<script>
import Helper from '~/service/Helpers';

const CATEGORY_ITEMS_COUNT = 32;
const CURRENT_FILTER = 'CURRENT_FILTER';
const FAVORITE_LIST = 'FAVORITE_LIST';
const ALL_PHOTOS = 'ALL_PHOTOS';

export default {
    props: {},

    data () {
        return {
            loading: false,
            filterName: 'default',
            favoriteList: [],
            defaultList: [],
            albumList: [],
        };
    },

    computed: {
        listItemsType () {
            return {
                CATEGORY: 'CATEGORY',
                PHOTO: 'PHOTO',
            };
        },
        getCurrentList () {
            const initList = this[`${this.filterName}List`];
            const columnItemsCount = Math.floor(initList.length / 4) || 1;
            let prevChunkIndex = 0;

            return initList.reduce((resultArray, item, index) => {
                let chunkIndex = Math.floor(index / columnItemsCount);
                if (prevChunkIndex < chunkIndex) {
                    if (item.type === this.listItemsType.CATEGORY) prevChunkIndex = chunkIndex;
                    else chunkIndex = prevChunkIndex;
                }
                if (!resultArray[chunkIndex]) {
                    resultArray[chunkIndex] = [];
                }
                resultArray[chunkIndex].push(item);

                return resultArray;
            }, []).filter((column) => column.length);
        },
    },

    async mounted () {
        this.loading = true;
        this.filterName = Helper.localStorage().get(CURRENT_FILTER) || 'default';
        this.favoriteList = Helper.localStorage().get(FAVORITE_LIST) || [];
        let allPhotos = Helper.localStorage().get(ALL_PHOTOS) || [];
        if (!allPhotos.length) {
            const rawData = await Helper.get('photos');
            allPhotos = this.prepareData(rawData);
            Helper.localStorage().set(ALL_PHOTOS, allPhotos);
        }
        this.initAlbumFilterData(allPhotos);
        this.initDefaultFilterData(JSON.parse(JSON.stringify(allPhotos)));
        this.margeFavorite();
        this.loading = false;
    },

    methods: {
        prepareData (allPhotos) {
            let prevCategoryName;
            let neededCountItemsForCategory;
            let itemsCount;
            const resultList = [];

            allPhotos.forEach((item) => {
                if (item.albumId > CATEGORY_ITEMS_COUNT) return;
                if (item.albumId !== prevCategoryName) {
                    prevCategoryName = item.albumId;
                    neededCountItemsForCategory = Helper.intRandom();
                    itemsCount = 0;
                }
                if (itemsCount < neededCountItemsForCategory) {
                    resultList.push({ ...item });
                }
                itemsCount += 1;
            });

            return resultList;
        },

        margeFavorite () {
            this.favoriteList.forEach((favoriteItem) => {
                const albumItemIndex = this.albumList.findIndex((item) => item.id === favoriteItem.id);
                this.albumList.splice(albumItemIndex, 1, { ...this.albumList[albumItemIndex], favorite: true });
                const defaultItemIndex = this.defaultList.findIndex((item) => item.id === favoriteItem.id);
                this.defaultList.splice(defaultItemIndex, 1, { ...this.defaultList[defaultItemIndex], favorite: true });
            });
        },

        initAlbumFilterData (allPhotos) {
            this.albumList = this.addItemsToCategory(
                allPhotos,
                'album',
                (item) => item.albumId,
            ).reduce((resultArray, item) => {
                if (item.type === this.listItemsType.CATEGORY) resultArray.push([item]);
                else resultArray[resultArray.length - 1].push(item);

                return resultArray;
            }, []).map((column) => column.sortByAlphabetAndCategory('title'))
                .reduce((resultArray, item) => [...resultArray, ...item], []);
        },

        initDefaultFilterData (allPhotos) {
            this.defaultList = this.addItemsToCategory(
                allPhotos.sortByAlphabetAndCategory('title'),
                'default',
                (item) => item.title.charAt(0).toUpperCase(),
            );
        },

        addToFavoriteList (photo) {
            this.favoriteList.push(photo);
            this.favoriteList = this.addItemsToCategory(
                this.favoriteList.filter((item) => item.type !== this.listItemsType.CATEGORY)
                    .sortByAlphabetAndCategory('title'),
                'favorite',
                (item) => item.title.charAt(0).toUpperCase(),
            );
        },

        addItemsToCategory (list, listName, initFunc) {
            let prevCategoryName;
            const resultList = [];
            list.forEach((item) => {
                const currentCategoryName = initFunc(item);
                if (currentCategoryName !== prevCategoryName) {
                    prevCategoryName = currentCategoryName;
                    resultList.push({ title: currentCategoryName, type: this.listItemsType.CATEGORY });
                }
                resultList.push({ ...item, type: this.listItemsType.PHOTO, favorite: listName === 'favorite' });
            });

            return resultList;
        },

        changeFilter (filterName) {
            this.filterName = filterName;
            Helper.localStorage().set(CURRENT_FILTER, filterName);
        },

        addFavorites (photo) {
            this.updateFavoriteValueInList(this.albumList, photo);
            this.updateFavoriteValueInList(this.defaultList, photo);
            this.addToFavoriteList(photo);
            Helper.localStorage().set(FAVORITE_LIST, this.favoriteList);
        },

        removeFavorites (photo) {
            const photoIndex = this.favoriteList.findIndex((item) => item.id === photo.id);
            const isSoloInCategory = (!this.favoriteList[photoIndex + 1]
              || this.favoriteList[photoIndex + 1].type === this.listItemsType.CATEGORY)
              && this.favoriteList[photoIndex - 1].type === this.listItemsType.CATEGORY;
            this.favoriteList.splice(isSoloInCategory ? photoIndex - 1 : photoIndex, isSoloInCategory ? 2 : 1);
            Helper.localStorage().set(FAVORITE_LIST, this.favoriteList);
            this.updateFavoriteValueInList(this.albumList, photo);
            this.updateFavoriteValueInList(this.defaultList, photo);
        },

        updateFavoriteValueInList (list, photo) {
            const indexFromFilter = list.findIndex((element) => element.id === photo.id);
            if (indexFromFilter !== -1) {
                list.splice(indexFromFilter, 1, { ...photo, favorite: !photo.favorite });
            }
        },
    },
};
</script>

<style lang="scss">
.vendor-filter {
    font-weight: 700;
    font-family: Open Sans, Roboto, sans-serif;
    width: 1300px;
    height: 600px;
    margin: auto;
    padding: 3.6rem 4.8rem 6rem;
    font-size: 1.2rem;
    background: #ffffff;
    border-radius: 1.2rem;
    box-sizing: border-box;

    &__header {
        margin: 0 0 1.5rem;
    }

    &__title {
        font-weight: bold;
        font-size: 1.4rem;
        line-height: 1.9rem;
    }

    &__name {
        margin: 0 0.5rem;
        text-decoration: underline;
        cursor: pointer;
    }

    &__scroll-wrap {
        overflow: hidden;
    }

    &__scroll {
        width: 100%;
        max-height: 50rem;
        overflow-y: auto;
        -ms-overflow-style: none;
        scrollbar-width: none;
        display: flex;
    }

    &__scroll::-webkit-scrollbar {
        display: none;
    }

    &__list {
        position: relative;
        margin-right: 4rem;
    }

    &__letter {
        margin: 0 2rem 1rem;
        font-size: 1.4rem;
        line-height: 1.9rem;
    }

    &__photo-item {
        width: 260px;
        height: 40px;
        padding: 4px;
        margin-bottom: 10px;
        background: #f7f8f9;
        border-radius: 1.2rem;
        box-sizing: border-box;
        display: flex;
    }

    &__photo-icon {
        width: 32px;
        height: 32px;
        border-radius: 1.2rem;
    }

    &__photo-name {
        padding: 0 0 0 11px;
        vertical-align: middle;
        display: inline-flex;
        align-items: center;
        flex-grow: 3;
    }

    &__btn {
        min-width: 15px;
        margin: 4px;
        cursor: pointer;
        text-align: center;
    }

    &__btn-control {
        flex-grow: 1;
        align-items: center;
        display: flex;
        flex-direction: row-reverse;
    }
}
</style>
