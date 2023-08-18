import './sass/styles.scss';
import 'bootstrap';
import i18next from 'i18next';

import * as yup from 'yup';
import _ from 'lodash';
import axios from 'axios';
import ru from './translation.js';
import parser from './parser.js';
import watch from './view.js';

const DELAY = 5000;
// получение прокладки для урл, чтобы нормально все работало
const getProxiedUrl = (url) => {
  console.log('getProxiedUrl - url:', url);
  const resultUrl = new URL('https://allorigins.hexlet.app/get');
  resultUrl.searchParams.set('url', url);
  resultUrl.searchParams.set('disableCache', true);
  return resultUrl;
};
// новые посты. Фильтр стейт на ссылки, получение промисов, парсинг
// сверка полученного, пдобавление постов в стейт, ловля ошибок
const getUpdatePosts = (state) => {
  // console.log('getUpdatePosts - state', state);
  const urls = state.feeds.map((feed) => feed.url);
  const promises = urls.map((url) => axios
    .get(getProxiedUrl(url))
    .then((response) => {
      const data = parser(response.data.contents);
      console.log('data:', data);

      const comparator = (arrayValue, otherValue) => arrayValue.title === otherValue.title;
      const addedPosts = _.differenceWith(
        data.items,
        state.posts,
        comparator,
      );

      if (addedPosts.length === 0) {
        return;
      }
      state.posts = addedPosts.concat(...state.posts);
    })
    .catch((err) => {
      console.error(err);
    }));

  Promise.all(promises).finally(() => setTimeout(() => getUpdatePosts(state), DELAY));
};
// валидаторная схема
const validateUrl = (url, urls) => yup
  .string()
  .url('invalidUrl')
  .notOneOf(urls, 'alreadyLoaded')
  .required('required')
  .validate(url);
// инициализация библиотеки, указание языков для перевода и источников
const app = async () => {
  const i18nextInstance = i18next.createInstance();
  await i18nextInstance.init({
    lng: 'ru', // основной язык
    debug: false,
    resources: {
      ru,
    },
  });

  // формы
  const elements = {
    input: document.querySelector('#url-input'),
    form: document.querySelector('form'),
    feedback: document.querySelector('.feedback'),
    posts: document.querySelector('.posts'),
    feeds: document.querySelector('.feeds'),
    button: document.querySelector('button'),
  };
    // состояние
  const state = {
    form: {
      status: 'filling',
      error: null,
    },
    feeds: [],
    posts: [],
    idCurrentpost: null,
    idVisitedPosts: [],
  };
    // отслеживание изменений состояния
  const watchedState = watch(state, elements, i18nextInstance);

  elements.form.addEventListener('submit', (evt) => {
    evt.preventDefault();
    // получили урл, сменили статус в стейте, сделали запрос с проксиУрлом,
    // обрабатываем ответ парсером
    // назначаем дате айди, берем ссылку
    // закидываем посты и дату с айди в стейт и меняем статус на успешный, ловим ошибки
    const formData = new FormData(evt.target);
    const currentUrl = formData.get('url');
    console.log('formData.get(url)', currentUrl);
    watchedState.form.status = 'loading';
    console.log('watchedState.form.status', watchedState);
    const urls = state.feeds.map((feed) => feed.url);
    validateUrl(currentUrl, urls)
      .then((link) => axios.get(getProxiedUrl(link)))
      .then((response) => {
        const data = parser(response.data.contents);
        data.feed.id = _.uniqueId();
        data.feed.url = currentUrl;
        const itemsWithId = Array.from(data.items).map((item) => {
          item.id = _.uniqueId();
          return item;
        });
        data.items = itemsWithId;
        watchedState.feeds.push(data.feed);
        watchedState.posts.unshift(...data.items);
        watchedState.form.status = 'success';
      })
      .catch((error) => {
        watchedState.form.status = 'failed';
        if (error.name === 'AniosError') {
          watchedState.form.error = 'network';
          return;
        }
        watchedState.form.error = error.message;
      });
  });
  // обновляемся
  elements.posts.addEventListener('click', ({ target }) => {
    const { id } = target.dataset;
    watchedState.idCurrentPost = id;
    if (!watchedState.idVisitedPosts.includes(id)) {
      watchedState.idVisitedPosts.push(id);
    }
  });

  getUpdatePosts(watchedState);
};
export default app;
