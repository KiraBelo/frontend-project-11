import './sass/styles.scss';
import 'bootstrap';
import i18next from 'i18next';
import { setLocale } from 'yup';

import * as yup from 'yup';
import onChange from 'on-change';
import _ from 'lodash';
import axios from 'axios';
import translation from './translation.json';

// инициализация библиотеки, указание языков для перевода и источников
i18next.init({
  lng: 'ru', // основной язык
  debug: true,
  resources: {
    ru: {
      translation: translation.ru,
    },
    en: {
      translation: translation.en,
    },
  },
});
// состояние в котором все хранится
const state = {
  feeds: [],
  posts: [],
};
// формы
const elements = {
  form: document.querySelector('.rss-form'),
  urlInput: document.querySelector('#url-input'),
  respondForm: document.querySelector('.feedback'),
};

// отслеживание изменений состояния
const watchedState = onChange(state, (path, value) => {
  value.forEach((item) => {
    switch (item.statusUrl) {
      case 'invalid':
        elements.respondForm.textContent = i18next.t(item.error);
        console.log(item.error);
        break;
      case 'valid':
        elements.respondForm.textContent = '';
        axios
          .get(`https://allorigins.hexlet.app/raw?url=${item.url}`)
          .then((response) => {
            const data = response.data;
            console.log(data);
            parseData(data);
            console.log('lfnf', getPostsFromHTML(data));
          })
          .catch((error) => {
            console.log(error);
          });
        break;
      default:
        break;
    }
  });
});
// слушатель событий работает на клик
elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  // схема валидации
  const schema = yup.object().shape({
    url: yup.string().url().required().notOneOf(validLinks(state)),
  });
  // локаль с переопределением текста ошибок
  setLocale({
    // use constant translation keys for messages without values
    mixed: {
      // use functions to generate an error object that includes the value from the schema
      default: 'invalid',
      required: 'required',
      notOneOf: 'notOneOf',
    },
    string: {
      url: 'url',
    },
  });

  const urlInput = elements.urlInput;
  const data = urlInput.value;
  urlInput.value = '';
  urlInput.focus();
  try {
    const formData = {
      url: data.trim(),
    };
    await schema.validate(formData);
    // Если валидация прошла успешно, можно отправить данные в стейт
    const goodUrl = {
      feed: data,
      id: _.uniqueId(),
      status: 'valid',
    };
    watchedState.feeds.push(goodUrl);
  } catch (error) {
    // если валидация не успешна, то в стайт отправляется другой объект
    const badUrl = {
      url: data,
      statusUrl: 'invalid',
      error: error.message,
    };
    watchedState.feeds.push(badUrl);
  }
  console.log(state);
});

const validLinks = (state) => {
  const validLink = state.feeds.map((feed) => feed.url);
  return validLink;
};

const parseData = (data) => {
  // console.log('data: ', data);
  const parser = new DOMParser();
  const parsedData = parser.parseFromString(data, 'text/html');
  // console.log('parsedData: ', parsedData);
  const finalData = {
    feedTitle: parsedData.querySelector('title').textContent,
    feedDescription: parsedData.querySelector('description').textContent,
    postMessage: getPostsFromHTML(parsedData),
    feedId: _.unicId(), //
  };
  console.log(finalData);
  return finalData;
};

const getPostsFromHTML = (parsedData) => {
  const posts = [];
  const items = parsedData.querySelectorAll('channel > item');

  items.forEach((item) => {
    // console.log(item);
    const title = item.querySelector('title').textContent;
    const linkElement = item.querySelector('link');
    const link = linkElement.getAttribute('href'); // получаем ссылку из атрибута href
    console.log(link);
    const post = `<a href="${link}">${title}</a>`; // добавляем ссылку в тег <a>

    posts.push(post);
  });
  console.log(posts);
  return posts;
};

const renderPostsBody = (data) => {
  const postsBody = document.createElement('div');
  postsBody.classList.add(
    'col-md-10',
    'col-lg-8',
    'order-1',
    'mx-auto',
    'posts'
  );
  const cardBody = document.createElement('div');
  cardBody.classList.add('col-md-10', 'col-l');
  const postsTitle = document.createElement('h2');
  postsTitle.classList.add('card-title', 'h4');
  postsTitle.textContent = 'Посты';
  cardBody.appendChild(postsTitle);
  postsBody.appendChild(cardBody);
  const contaner = document.querySelector(
    '.container-fluid',
    '.container-xxl',
    '.p-5'
  );
  return contaner.appendChild(postsBody);
};

const renderPosts = (watchedState) => {
  const data = watchedState.posts;
  data.forEach((post) => {});
};
