require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prisma/client');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const shopRoutes = require('./routes/shopRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const billingRoutes = require('./routes/billingRoutes');
const stockRoutes = require('./routes/stockRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route groups
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/shops', shopRoutes);
app.use('/categories', categoryRoutes);
app.use('/products', productRoutes);
app.use('/billing', billingRoutes);
app.use('/stock', stockRoutes);
app.use('/dashboard', dashboardRoutes);

app.get('/', (req, res) => res.send("Hamdan Glass POS BAckend by Basit Tech Solutions is live"));


app.get('/db-status', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: 'success', message: 'Database is connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Database connection failed', error: error.message });
    }
});

module.exports = app;    
