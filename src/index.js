import './sass/styles.scss';
import 'bootstrap';
import i18next from 'i18next';
import { setLocale } from 'yup';

import * as yup from 'yup';
import onChange from 'on-change';
import uniqueId from 'lodash/uniqueId.js';
import view from './view.js';
import translation from './translation.json';
import axios from 'axios';

//инициализация библиотеки, указание языков для перевода и источников
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
  validationLinks: [],
  feeds: [],
  posts: [],
};
//формы
const form = document.querySelector('.rss-form');
const urlInput = form.querySelector('#url-input');
//отслеживание изменений состояния
const watchedState = onChange(state, (path, value) => {
  const respondForm = document.querySelector('.feedback');
  value.forEach((item) => {
    console.log(item);
    switch (item.statusUrl) {
      case 'invalid':
        respondForm.textContent = i18next.t(item.error);
        break;
      case 'valid':
        respondForm.textContent = '';
        var xhr = new XMLHttpRequest();
        axios
          .get('https://www.example.com/feed.rss')
          .then((response) => {
            console.log(response.data);
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
//слушатель событий работает на клик
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  //схема валидации
  const schema = yup.object().shape({
    url: yup.string().url().required().notOneOf(state.validationLinks),
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
  //ссылка которую ввели в форму
  const data = urlInput.value;
  urlInput.value = '';
  urlInput.focus();
  try {
    const formData = {
      url: data,
    };
    await schema.validate(formData);
    // Если валидация прошла успешно, можно отправить данные в стейт
    const goodUrl = {
      url: data,
      statusUrl: 'valid',
      id: uniqueId(),
    };
    watchedState.feeds.push(goodUrl);
    watchedState.validationLinks.push(data);
  } catch (error) {
    //если валидация не успешна, то в стайт отправляется другой объект
    const badUrl = {
      url: data,
      statusUrl: 'invalid',
      error: error.message,
    };
    watchedState.feeds.push(badUrl);
  }
});
