const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Настройка сессии
app.use(session({
    secret: 'super-secret-key-12345',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Для http (localhost)
}));

// Middleware для передачи данных пользователя и корзины во все шаблоны
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cartCount = req.session.cart ? req.session.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
    // Определяем query, чтобы не было ошибки undefined в header
    res.locals.query = req.query.q || '';
    next();
});

// Фейковые данные (mock data)
const products = [
    {
        id: 1,
        name: "Винтажная Камера Leica",
        price: 12000,
        image: "https://loremflickr.com/640/480/camera,vintage",
        user: "ArtLover99",
        description: "Классическая пленочная камера в идеальном состоянии. В комплекте оригинальный чехол и ремешок. Работает безупречно, линза без царапин.",
        comments: [
            { user: "RetroFan", text: "Отличное состояние, работает как часы.", date: "2023-10-15" },
            { user: "PhotoGeek", text: "Цена немного завышена, но вещь редкая.", date: "2023-11-02" }
        ]
    },
    {
        id: 2,
        name: "MacBook Pro 2021",
        price: 85000,
        image: "https://loremflickr.com/640/480/laptop,macbook",
        user: "DevMaster",
        description: "Мощный ноутбук для работы и творчества. Процессор M1 Pro, 16GB RAM, 512GB SSD. Батарея держит отлично.",
        comments: [
            { user: "CodeNinja", text: "Почти новый, использовался для кодинга.", date: "2024-01-10" }
        ]
    },
    {
        id: 3,
        name: "Кроссовки Nike Air Jordan",
        price: 15000,
        image: "https://loremflickr.com/640/480/sneakers,nike",
        user: "SneakerHead",
        description: "Легендарные кроссовки. Надевались пару раз. Оригинальная коробка сохранилась.",
        comments: [
            { user: "BballPlayer", text: "Оригинал, коробка в комплекте.", date: "2023-12-05" },
            { user: "HypeBeast", text: "Какой размер?", date: "2023-12-06" }
        ]
    },
    {
        id: 4,
        name: "Игровой ПК (RTX 3080)",
        price: 150000,
        image: "https://loremflickr.com/640/480/gamingpc,computer",
        user: "GamerPro",
        description: "Зверь-машина. Тянет Cyberpunk 2077 на ультрах с трассировкой лучей. Тихий корпус, водяное охлаждение.",
        comments: [
            { user: "StreamerX", text: "Тянет всё на ультрах.", date: "2024-02-01" }
        ]
    },
    {
        id: 5,
        name: "Коллекция Виниловых Пластинок",
        price: 5000,
        image: "https://loremflickr.com/640/480/vinyl,record",
        user: "MusicFan",
        description: "Коллекция из 50 пластинок. Рок, джаз, блюз. Много редких изданий 70-х и 80-х годов.",
        comments: [
            { user: "VinylCollector", text: "Редкие издания 80-х.", date: "2023-09-20" }
        ]
    },
    {
        id: 6,
        name: "Велосипед Cube Analog",
        price: 45000,
        image: "https://loremflickr.com/640/480/bicycle,mountainbike",
        user: "Cyclist2024",
        description: "Горный велосипед, рама 19 дюймов. В хорошем состоянии, прошел ТО перед сезоном.",
        comments: [
            { user: "TrailRider", text: "Пробег минимальный.", date: "2023-08-30" }
        ]
    }
];

// In-memory Users DB
const users = [];

// --- Routes ---

app.get('/', (req, res) => {
    res.render('landing');
});

app.get('/shop', (req, res) => {
    const query = req.query.q || '';
    if (query) {
        // Если есть query, фильтруем
        const filteredProducts = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
        res.render('index', { products: filteredProducts, query: query });
    } else {
        res.render('index', { products: products, query: null });
    }
});

app.get('/search', (req, res) => {
    const query = req.query.q || '';
    // УЯЗВИМОСТЬ: XSS
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    res.render('index', { products: filteredProducts, query: query });
});

// Auth Routes
app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.user = { username: user.username };
        return res.redirect('/');
    }
    // Для демо пускаем "Admin" / "admin" даже если его нет в базе (бекдорчик или просто хардкод для удобства)
    if (username === 'admin' && password === 'admin') {
        req.session.user = { username: 'admin' };
        return res.redirect('/');
    }

    res.render('login', { error: 'Неверный логин или пароль' });
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.render('login', { error: 'Пользователь уже существует' });
    }
    users.push({ username, password });
    req.session.user = { username };
    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Cart Routes
app.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    res.render('cart', { cart: cart });
});

app.post('/cart/add/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        if (!req.session.cart) req.session.cart = [];
        const existingItem = req.session.cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            req.session.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }
    }
    // Redirect back to where we came from, or cart
    res.redirect(req.get('referer') || '/cart');
});

// Product Routes
app.get('/product/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (!product) return res.status(404).send('Товар не найден');
    res.render('product', { product: product });
});

app.post('/product/:id/add-comment', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        const username = req.session.user ? req.session.user.username : 'Гость';
        const newComment = {
            user: username,
            text: req.body.comment, // УЯЗВИМОСТЬ: Stored XSS
            date: new Date().toISOString().split('T')[0]
        };
        product.comments.push(newComment);
    }
    res.redirect(`/product/${req.params.id}`);
});

// Static Pages
app.get('/about', (req, res) => {
    res.render('page', { title: 'О нас', content: 'ShopMarket - это ведущая онлайн-платформа для покупки и продажи уникальных товаров. Мы работаем с 2010 года и гарантируем качество.' });
});

app.get('/terms', (req, res) => {
    res.render('page', { title: 'Условия использования', content: '1. Ведите себя прилично. 2. Не используйте уязвимости сайта (кроме учебных целей). 3. Удачных покупок!' });
});

app.get('/help', (req, res) => {
    res.render('page', { title: 'Помощь', content: 'Если у вас возникли вопросы, пишите нам на support@shopmarket.fake. FAQ: Как купить? Нажать кнопку.' });
});


const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
