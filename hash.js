const bcrypt = require('bcrypt');

bcrypt.hash('admin123', 10)
  .then(hash => {
    console.log('Хеш:', hash);
  })
  .catch(err => {
    console.error('Ошибка:', err);
  });