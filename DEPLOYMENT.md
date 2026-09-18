# Развёртывание full-stack приложения на VPS/VDS

Стек: **React 19 + TypeScript + Mobx** (frontend), **Node.js + Express + Sequelize + PostgreSQL** (backend), **Nginx** (reverse proxy + раздача статики), **PM2** (менеджер процессов), **Let's Encrypt** (HTTPS). Оплата ЮKassa (пока фейковая), отправка почты через SMTP, генерация моков и эндпоинтов через OpenAPI + Orval.

Ниже — пошаговый гайд с конкретными командами. ОС на сервере: **Ubuntu 22.04/24.04 LTS** (на Debian команды почти идентичны). Все команды, где не указано иное, выполняются на сервере под пользователем, который имеет права `sudo`.

---

## 0. Содержание

1. [Требования к серверу](#1-требования-к-серверу)
2. [Первичная настройка сервера](#2-первичная-настройка-сервера)
3. [Установка PostgreSQL](#3-установка-postgresql)
4. [Установка Node.js](#4-установка-nodejs)
5. [Установка Nginx](#5-установка-nginx)
6. [Установка PM2](#6-установка-pm2)
7. [Структура проекта на сервере](#7-структура-проекта-на-сервере)
8. [Клонирование репозитория и окружение](#8-клонирование-репозитория-и-окружение)
9. [Настройка базы данных](#9-настройка-базы-данных)
10. [Сборка и запуск backend](#10-сборка-и-запуск-backend)
11. [Сборка frontend](#11-сборка-frontend)
12. [Конфигурация Nginx](#12-конфигурация-nginx)
13. [HTTPS (Let's Encrypt)](#13-https-lets-encrypt)
14. [Отправка почты (SMTP)](#14-отправка-почты-smtp)
15. [Оплата ЮKassa (фейковый режим)](#15-оплата-юkassa-фейковый-режим)
16. [OpenAPI + Orval: генерация моков и эндпоинтов](#16-openapi--orval-генерация-моков-и-эндпоинтов)
17. [Firewall (ufw)](#17-firewall-ufw)
18. [Логи, перезапуск, обновление](#18-логи-перезапуск-обновление)
19. [CI/CD через GitHub Actions (опционально)](#19-cicd-через-github-actions-опционально)
20. [Чек-лист перед продом](#20-чек-лист-перед-продом)

---

## 1. Требования к серверу

- **VPS/VDS** на Ubuntu 22.04 или 24.04 LTS.
- **RAM:** от 1 ГБ (минимум), рекомендуется 2 ГБ для сборки frontend (Vite/TS могут потребовать память; при 1 ГБ добавьте swap — см. п. 2).
- **Диск:** от 20 ГБ.
- **Домен**, направленный A-записью на IP сервера (для HTTPS). Пример: `example.com` и `api.example.com` (или один домен с `/api`).
- Доступ по SSH с правами `sudo`.

В гайде используются:
- `example.com` — домен frontend.
- `/api` — префикс проксирования на backend (можно вынести backend на поддомен `api.example.com`, см. примечание в п. 12).

---

## 2. Первичная настройка сервера

Подключитесь по SSH (замените `user` и `IP`):

```bash
ssh user@IP
```

### 2.1 Обновление пакетов

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ca-certificates gnupg ufw
```

### 2.2 Добавление swap (если RAM ≤ 2 ГБ)

Сборка frontend на Vite с TypeScript может падать по OOM. Добавим 2 ГБ swap:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Проверка:

```bash
free -h
```

### 2.3 Время и таймзона

```bash
sudo timedatectl set-timezone Europe/Moscow
timedatectl
```

### 2.4 (Опционально) Создание отдельного пользователя для приложения

Если вы вошли как `root`, создайте непривилегированного пользователя:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
# Перенесите SSH-ключи:
sudo rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
# Затем заходите как deploy
```

Далее команды выполняются от `deploy` (или вашего обычного пользователя).

---

## 3. Установка PostgreSQL

Ставим PostgreSQL 16 (на Ubuntu 24.04; на 22.04 — 14/15):

```bash
sudo apt install -y postgresql postgresql-contrib
```

Запуск и автозагрузка:

```bash
sudo systemctl enable --now postgresql
sudo systemctl status postgresql
```

### 3.1 Создание базы и пользователя

Зайдите под системным пользователем `postgres`:

```bash
sudo -u postgres psql
```

В консоли PostgreSQL выполните (замените пароль на сильный):

```sql
CREATE USER app_user WITH PASSWORD 'СИЛЬНЫЙ_ПАРОЛЬ';
CREATE DATABASE app_db OWNER app_user ENCODING 'UTF8' LC_COLLATE 'ru_RU.UTF-8' LC_CTYPE 'ru_RU.UTF-8' TEMPLATE template0;
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
\q
```

Если локаль `ru_RU.UTF-8` недоступна, сгенерируйте её:

```bash
sudo locale-gen ru_RU.UTF-8
sudo systemctl restart postgresql
```

Или используйте `C.UTF-8`:

```sql
CREATE DATABASE app_db OWNER app_user ENCODING 'UTF8' LC_COLLATE 'C.UTF-8' LC_CTYPE 'C.UTF-8' TEMPLATE template0;
```

### 3.2 Настройка подключения

По умолчанию PostgreSQL слушает только `localhost` — это безопасно и подходит, т.к. backend работает на том же сервере. Проверьте:

```bash
sudo grep listen_addresses /etc/postgresql/*/main/postgresql.conf
# должно быть: listen_addresses = 'localhost'
```

Если нужно подключаться извне (например, для отладки), измените `listen_addresses = '*'` и настройте `pg_hba.conf`, но **для прода лучше держать backend и БД на одном хосте и не открывать порт 5432 наружу**.

---

## 4. Установка Node.js

Ставим LTS-версию через NodeSource (на момент написания — Node 20 LTS; для многих пакетов подходит и 22):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

> На этом Windows-сервере разработки используется `npm.cmd`/`npx.cmd` из-за PowerShell. На Linux VPS обычные `npm`/`npx` работают штатно.

---

## 5. Установка Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx
nginx -v
```

Проверьте, что отвечает дефолтная страница: откройте `http://IP` в браузере.

---

## 6. Установка PM2

PM2 будет держать backend запущенным и перезапускать его при падении/ребуте сервера:

```bash
sudo npm install -g pm2
pm2 -v
```

Чтобы PM2 поднимал процессы после перезагрузки сервера:

```bash
pm2 startup systemd -u $USER --hp $HOME
# PM2 выведет команду вида: sudo env PATH=$PATH:... pm2 startup ...
# выполните её, затем:
pm2 save
```

---

## 7. Структура проекта на сервере

Предполагаем монорепозиторий: одна корневая папка с `frontend/` и `backend/` (или `client/`/`server/` — адаптируйте пути под себя):

```
/home/deploy/app/
├── frontend/        # React + TS + Mobx (Vite)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
├── backend/         # Node + Express + Sequelize
│   ├── package.json
│   ├── dist/        # скомпилированный TS
│   ├── src/
│   └── openapi.yaml
└── README.md
```

Если у вас другая структура (например, `packages/`), просто заменяйте пути в командах.

---

## 8. Клонирование репозитория и окружение

### 8.1 Клонирование

```bash
cd ~
git clone https://github.com/ВАШ_ОРГ/ВАШ_РЕПО.git app
cd app
```

Если репозиторий приватный, используйте SSH-ключ или Personal Access Token. Для SSH:

```bash
git clone git@github.com:ВАШ_ОРГ/ВАШ_РЕПО.git app
```

(предварительно добавьте публичный ключ сервера в GitHub → Settings → SSH keys).

### 8.2 Установка зависимостей

```bash
cd ~/app/backend
npm ci            # или: npm install --omit=dev для прода
cd ~/app/frontend
npm ci
```

> `npm ci` ставит точные версии из `package-lock.json` — обязательно для воспроизводимости.

### 8.3 Файлы окружения

Создайте `.env` файлы. **Не коммитьте их** — держите в `.gitignore`. На сервере создаёте вручную (или через секреты CI).

`~/app/backend/.env`:

```dotenv
# Сервер
NODE_ENV=production
PORT=4000
HOST=127.0.0.1

# База данных
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=app_db
DB_USER=app_user
DB_PASSWORD=СИЛЬНЫЙ_ПАРОЛЬ
DB_DIALECT=postgres
DB_SSL=false

# JWT / сессии
JWT_SECRET=ОЧЕНЬ_ДЛИННАЯ_СЛУЧАЙНАЯ_СТРОКА
JWT_EXPIRES_IN=7d

# CORS
CLIENT_ORIGIN=https://example.com

# Почта (SMTP) — см. п. 14
SMTP_HOST=smtp.yandex.ru
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=ПАРОЛЬ_ПРИЛОЖЕНИЯ
SMTP_FROM="Сервис <noreply@example.com>"

# ЮKassa — см. п. 15
YOOKASSA_SHOP_ID=000000
YOOKASSA_SECRET_KEY=live_или_test_ключ
YOOKASSA_FAKE=true
YOOKASSA_RETURN_URL=https://example.com/payment/result
```

Сгенерировать `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

`~/app/frontend/.env` (Vite читает только `VITE_`-переменные):

```dotenv
VITE_API_BASE_URL=https://example.com/api
VITE_YOOKASSA_FAKE=true
```

> Если frontend и API на одном домене через `/api`, можно вообще не задавать `VITE_API_BASE_URL` и использовать относительный путь `/api` в axios-клиенте.

Защитите файлы от чтения другими пользователями:

```bash
chmod 600 ~/app/backend/.env ~/app/frontend/.env
```

---

## 9. Настройка базы данных

### 9.1 Миграции и сиды (Sequelize CLI)

Если используете `sequelize-cli`:

```bash
cd ~/app/backend
npx sequelize-cli db:migrate --env production
npx sequelize-cli db:seed:all --env production   # только если нужны сиды на проде
```

Если миграции описаны кодом (через `umzug` или `sequelize.sync()` в dev-режиме), на проде используйте только миграции, **не `sync({ force: true })`** — это сотрёт данные.

### 9.2 Проверка подключения

```bash
cd ~/app/backend
node -e "const s=require('./dist/models').sequelize; s.authenticate().then(()=>{console.log('OK');process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})"
```

---

## 10. Сборка и запуск backend

### 10.1 Сборка TypeScript

Если backend на TS (например, через `tsc` или `tsup`):

```bash
cd ~/app/backend
npm run build
# результат в dist/ (или build/)
```

### 10.2 Запуск через PM2

Создайте `ecosystem.config.js` в `~/app/backend`:

```js
module.exports = {
  apps: [
    {
      name: 'app-backend',
      cwd: __dirname,
      script: 'dist/index.js',          // точка входа после сборки
      instances: 1,                     // для начала; можно 'max' с cluster mode
      exec_mode: 'fork',                // или 'cluster', если приложение stateless
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      max_memory_restart: '400M',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      time: true,
    },
  ],
};
```

Создайте папку логов и запустите:

```bash
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 status
pm2 logs app-backend --lines 50
```

Проверьте, что backend отвечает локально:

```bash
curl http://127.0.0.1:4000/api/health
```

> Backend слушает `127.0.0.1:4000` — наружу порт не торчит, всё проксируется через Nginx.

---

## 11. Сборка frontend

```bash
cd ~/app/frontend
npm run build
# результат в dist/ (Vite по умолчанию)
```

Собранные статические файлы будут лежать в `~/app/frontend/dist`. Nginx будет раздавать их напрямую.

Проверьте, что `dist/index.html` существует:

```bash
ls -la ~/app/frontend/dist
```

> Vite + React 19: убедитесь, что в `vite.config.ts` не задан `base` (или задан корректно, если приложение не в корне домена).

---

## 12. Конфигурация Nginx

Создайте конфиг сайта:

```bash
sudo nano /etc/nginx/sites-available/example.com
```

Содержимое (один домен, `/api` проксируется на backend):

```nginx
# Размер тела запроса (для загрузок/файлов)
client_max_body_size 20m;

# upstream до backend
upstream app_backend {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # Логи
    access_log /var/log/nginx/example.com.access.log;
    error_log  /var/log/nginx/example.com.error.log;

    # Корень со статикой frontend
    root /home/deploy/app/frontend/dist;
    index index.html;

    # Сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_proxied any;

    # API проксируется на backend
    location /api/ {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Статика frontend с кешированием
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback: все неизвестные пути отдают index.html
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

Включите конфиг и проверьте синтаксис:

```bash
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 12.1 Вариант: backend на поддомене `api.example.com`

Если хотите разделить, создайте второй `server`-блок:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Тогда в `frontend/.env` укажите `VITE_API_BASE_URL=https://api.example.com` и пересоберите frontend.

### 12.2 Права на чтение статики

Nginx работает от `www-data` и должен иметь доступ на чтение к `/home/deploy/app/frontend/dist`. Проверьте:

```bash
sudo -u www-data stat /home/deploy/app/frontend/dist/index.html
```

Если ошибка `Permission denied`, дайте права на исполнение домашней директории (только на чтение/обход, не на запись):

```bash
chmod 711 /home/deploy
chmod -R a+rX /home/deploy/app/frontend/dist
```

---

## 13. HTTPS (Let's Encrypt)

Поставьте Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Получите сертификат (предварительно убедитесь, что A-запись `example.com` указывает на IP сервера и порт 80 открыт):

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Certbot сам допишет `listen 443 ssl` и редирект с 80 на 443 в конфиг Nginx. Проверьте автопродление:

```bash
sudo certbot renew --dry-run
```

Certbot устанавливает systemd-таймер `certbot.timer`, который сам продлевает сертификаты. Проверьте:

```bash
sudo systemctl list-timers | grep certbot
```

После включения HTTPS обновите env, если нужно (например, `CLIENT_ORIGIN=https://example.com`), и перезапустите backend:

```bash
pm2 restart app-backend
```

---

## 14. Отправка почты (SMTP)

Для восстановления пароля и техподдержки используйте `nodemailer`. Пример сервиса в backend:

```ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendMail(to: string, subject: string, html: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html,
  });
}
```

### 14.1 Выбор SMTP-провайдера

- **Яндекс 360 (для своего домена)** — бесплатно для небольших объёмов, нужен «пароль приложения» (не основной пароль аккаунта).
- **Mailgun / SendGrid / Postmark** — надёжные транзакционные сервисы, есть бесплатные тарифы.
- **Свой Postfix** — только если готовы настраивать DKIM/SPF/DMARC и следить за репутацией IP; для старта **не рекомендуется**.

### 14.2 DNS-записи для домена

Чтобы письма не падали в спам, настройте на домене:

- **SPF:** `TXT @ "v=spf1 include:_spf.yandex.ru ~all"` (для Яндекса; для других провайдеров — своя).
- **DKIM:** добавьте публичный ключ, который выдаёт провайдер.
- **DMARC:** `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:postmaster@example.com"`.

### 14.3 Проверка отправки

```bash
curl -X POST http://127.0.0.1:4000/api/support/test-mail \
  -H "Content-Type: application/json" \
  -d '{"to":"ваш@личный.ящик","subject":"Тест","body":"Привет"}'
```

(предполагая, что вы сделали такой тестовый эндпоинт для админа; на проде его нужно защитить или убрать).

---

## 15. Оплата ЮKassa (фейковый режим)

### 15.1 Логика фейкового режима

В backend держите флаг `YOOKASSA_FAKE=true`. Когда он включён, вместо реального запроса к API ЮKassa возвращается заглушка с `status: 'succeeded'` (или `pending` + имитация вебхука):

```ts
async function createPayment(amount: number, description: string) {
  if (process.env.YOOKASSA_FAKE === 'true') {
    return {
      id: 'fake_' + crypto.randomUUID(),
      status: 'succeeded',
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', confirmation_url: process.env.YOOKASSA_RETURN_URL },
      paid: true,
      fake: true,
    };
  }
  // реальный вызов к https://api.yookassa.ru/v3/payments
  // ...
}
```

Frontend по `VITE_YOOKASSA_FAKE=true` показывает плашку «Тестовый режим оплаты».

### 15.2 Подготовка к реальной интеграции

- Зарегистрируйте магазин в ЮKassa, получите `shopId` и секретный ключ.
- Настройте вебхук `payment.succeeded` на `https://example.com/api/payments/webhook` (URL должен быть публичным и на HTTPS — ЮKassa не примет HTTP).
- Вебхук проверяйте подлинность через HTTP-заголовок, который подписывает ЮKassa.
- Когда готовы, поставьте `YOOKASSA_FAKE=false` и перезапустите backend.

### 15.3 Безопасность

- Секретный ключ ЮKassa **только** в `backend/.env`, никогда не отдавайте его на frontend.
- Вебхук должен быть идемпотентным (повторные запросы не должны дважды зачислять оплату).

---

## 16. OpenAPI + Orval: генерация моков и эндпоинтов

### 16.1 Где лежит спецификация

Допустим, OpenAPI-спецификация в `backend/openapi.yaml` (или `openapi/openapi.yaml`). Orval использует её для генерации:

- TypeScript-клиента для frontend (типизированные функции-обёртки над axios).
- MSW-моков для разработки/тестов.

### 16.2 Конфиг Orval

`orval.config.ts` в корне проекта:

```ts
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: { target: './backend/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: './frontend/src/api/generated',
      schemas: './frontend/src/api/generated/models',
      client: 'axios',
      mock: true,
      httpClient: 'axios',
      override: {
        mutator: { path: './frontend/src/api/axios-instance.ts', name: 'customInstance' },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
});
```

### 16.3 Запуск генерации

```bash
# из корня проекта
npx orval --config orval.config.ts
```

Добавьте в `package.json` скрипты (в корне или в `frontend`):

```json
{
  "scripts": {
    "gen:api": "orval --config orval.config.ts",
    "mock:server": "msw init ./frontend/public"
  }
}
```

### 16.4 Когда перегенерировать

- После изменения `openapi.yaml` — на сервере это нужно **только если вы собираете на сервере**. Рекомендуется генерировать код локально (или в CI) и коммитить, а на сервере только `npm ci && npm run build`. Тогда на VPS Orval не нужен.

### 16.5 MSW-моки

MSW используется в dev/тестах, в проде моки обычно не нужны (есть реальный backend). Убедитесь, что в production-сборке frontend MSW не перехватывает запросы:

```ts
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}
```

---

## 17. Firewall (ufw)

Открываем только SSH, HTTP и HTTPS. Порт backend (4000) и PostgreSQL (5432) наружу **не открываем**:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # открывает 80 и 443
sudo ufw enable
sudo ufw status verbose
```

Если нужно ограничить SSH конкретными IP:

```bash
sudo ufw allow from ВАШ_IP to any port 22
```

---

## 18. Логи, перезапуск, обновление

### 18.1 Логи backend

```bash
pm2 logs app-backend --lines 100
pm2 logs app-backend --err
```

Ротация логов:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 18.2 Логи Nginx

```bash
sudo tail -f /var/log/nginx/example.com.access.log
sudo tail -f /var/log/nginx/example.com.error.log
```

### 18.3 Обновление приложения

Скрипт деплоя `~/app/deploy.sh` (сделайте исполняемым: `chmod +x ~/app/deploy.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

cd ~/app
echo "==> git pull"
git pull --ff-only

echo "==> backend: install + build + restart"
cd backend
npm ci --omit=dev
npm run build
pm2 restart app-backend

echo "==> frontend: install + build"
cd ../frontend
npm ci
npm run build

echo "==> reload nginx"
sudo systemctl reload nginx

echo "==> done"
pm2 status
```

Запуск:

```bash
~/app/deploy.sh
```

### 18.4 После перезагрузки сервера

PM2 поднимет процессы автоматически (если выполнена команда `pm2 startup` и `pm2 save`). Nginx и PostgreSQL включены в автозагрузку через `systemctl enable`.

---

## 19. CI/CD через GitHub Actions (опционально)

Пример простого workflow, который собирает и деплоит по SSH. Добавьте секреты в репозиторий: `SSH_PRIVATE_KEY`, `SERVER_IP`, `SERVER_USER`.

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy over SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_IP }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd ~/app
            ./deploy.sh
```

Для продвинутого пайплайна добавьте шаги: линт, тесты, генерацию Orval, сборку Docker-образа и т.д.

---

## 20. Чек-лист перед продом

- [ ] `.env` файлы созданы и в `.gitignore`, права `600`.
- [ ] `JWT_SECRET` — длинная случайная строка.
- [ ] БД: миграции выполнены, `sync({ force })` отключён.
- [ ] Backend слушает `127.0.0.1`, порт не открыт в ufw.
- [ ] Nginx: SPA fallback работает, `/api` проксируется.
- [ ] HTTPS включён, редирект с HTTP на HTTPS работает.
- [ ] CORS: `CLIENT_ORIGIN` указывает на `https://example.com`.
- [ ] SPF/DKIM/DMARC настроены, тестовое письмо доходит.
- [ ] ЮKassa: фейковый режим включён, вебхук-эндпоинт готов.
- [ ] PM2: `pm2 save` выполнен, `pm2 startup` настроен.
- [ ] Бэкапы БД настроены (см. ниже).
- [ ] Логи ротируются.

### Бэкапы PostgreSQL

Простой скрипт `~/backup-db.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR=~/backups
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/app_db_$(date +%F_%H%M).sql.gz"
PGPASSWORD=СИЛЬНЫЙ_ПАРОЛЬ pg_dump -U app_user -h 127.0.0.1 app_db | gzip > "$FILE"
# храним последние 14 дней
find "$BACKUP_DIR" -name "app_db_*.sql.gz" -mtime +14 -delete
```

Cron:

```bash
crontab -e
# ежедневно в 03:00
0 3 * * * /home/deploy/backup-db.sh
```

---

## Полезные команды шпаргалка

```bash
# PM2
pm2 status
pm2 logs app-backend
pm2 restart app-backend
pm2 reload app-backend
pm2 stop app-backend
pm2 delete app-backend
pm2 monit

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart nginx

# PostgreSQL
sudo systemctl restart postgresql
sudo -u postgres psql
psql -U app_user -h 127.0.0.1 -d app_db

# Certbot
sudo certbot certificates
sudo certbot renew --dry-run

# ufw
sudo ufw status
sudo ufw allow 'Nginx Full'
```

---

## Возможные проблемы

| Симптом | Причина / решение |
|---|---|
| `502 Bad Gateway` | Backend не запущен или слушает не на `127.0.0.1:4000`. `pm2 logs app-backend`. |
| `404` на SPA-роутах | Не работает `try_files ... /index.html`. Проверьте блок `location /`. |
| `EADDRINUSE :4000` | Порт занят. `pm2 list`, `lsof -i:4000`. |
| Сборка frontend падает с OOM | Добавьте swap (п. 2.2) или собирайте локально/в CI. |
| Письма в спаме | Настройте SPF/DKIM/DMARC (п. 14.2). |
| `Permission denied` на статику | `chmod 711 /home/deploy` + `chmod -R a+rX .../dist` (п. 12.2). |
| Certbot не выдаёт сертификат | A-запись не указывает на IP, либо порт 80 закрыт ufw. |
