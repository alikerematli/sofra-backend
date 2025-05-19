const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'https://silver-lollipop-8fe80a.netlify.app'
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (ext && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Data storage (in-memory for simplicity, would use a database in production)
let products = [];
let categories = [];

// Load initial data if exists
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

const productsFile = path.join(dataPath, 'products.json');
const categoriesFile = path.join(dataPath, 'categories.json');

try {
  if (fs.existsSync(productsFile)) {
    products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
  } else {
    // Initialize with sample data
    products = [
      {
        id: '1',
        name: {
          en: 'Salad Plate',
          it: 'Piatto da Insalata'
        },
        description: {
          en: '13\' Salad Plate',
          it: 'Piatto da Insalata 13\''
        },
        category: 'plates',
        image: '/src/assets/images/Salata.png',
        dimensions: '33 cm',
        material: 'Melamine',
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        name: {
          en: 'Round Plate',
          it: 'Piatto Rotondo'
        },
        description: {
          en: '8.75 Round Plate Pink',
          it: 'Piatto Rotondo Rosa 8.75'
        },
        category: 'plates',
        image: '/src/assets/images/8.75 Round Plate Pembe.png',
        dimensions: '22 cm',
        material: 'Melamine',
        createdAt: new Date().toISOString()
      },
      {
        id: '3',
        name: {
          en: 'Oval Salad Plate',
          it: 'Piatto da Insalata Ovale'
        },
        description: {
          en: '33 cm Oval Salad Plate',
          it: 'Piatto da Insalata Ovale 33 cm'
        },
        category: 'plates',
        image: '/src/assets/images/Yeni Oval Büyük Salata.png',
        dimensions: '33 cm',
        material: 'Melamine',
        createdAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
  }

  if (fs.existsSync(categoriesFile)) {
    categories = JSON.parse(fs.readFileSync(categoriesFile, 'utf8'));
  } else {
    // Initialize with sample data
    categories = [
      {
        id: '1',
        name: {
          en: 'Plates',
          it: 'Piatti'
        },
        slug: 'plates'
      },
      {
        id: '2',
        name: {
          en: 'Bowls',
          it: 'Ciotole'
        },
        slug: 'bowls'
      },
      {
        id: '3',
        name: {
          en: 'Accessories',
          it: 'Accessori'
        },
        slug: 'accessories'
      }
    ];
    fs.writeFileSync(categoriesFile, JSON.stringify(categories, null, 2));
  }
} catch (error) {
  console.error('Error loading initial data:', error);
}

// Helper function to save data
const saveData = (data, filename) => {
  fs.writeFileSync(path.join(dataPath, filename), JSON.stringify(data, null, 2));
};

// Routes
// Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Get product by ID
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  res.json(product);
});

// Create new product
app.post('/api/products', upload.single('image'), (req, res) => {
  try {
    const productData = JSON.parse(req.body.data);
    const newProduct = {
      id: uuidv4(),
      ...productData,
      image: req.file ? `/uploads/${req.file.filename}` : productData.image,
      createdAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    saveData(products, 'products.json');
    
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Update product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const productData = JSON.parse(req.body.data);
    const updatedProduct = {
      ...products[productIndex],
      ...productData,
      image: req.file ? `/uploads/${req.file.filename}` : productData.image || products[productIndex].image,
      updatedAt: new Date().toISOString()
    };
    
    products[productIndex] = updatedProduct;
    saveData(products, 'products.json');
    
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  const productIndex = products.findIndex(p => p.id === req.params.id);
  if (productIndex === -1) {
    return res.status(404).json({ message: 'Product not found' });
  }
  
  // If product has an image, delete it
  const product = products[productIndex];
  if (product.image && product.image.startsWith('/uploads/')) {
    const imagePath = path.join(__dirname, product.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
  
  products.splice(productIndex, 1);
  saveData(products, 'products.json');
  
  res.json({ message: 'Product deleted successfully' });
});

// Category routes
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.post('/api/categories', (req, res) => {
  const newCategory = {
    id: uuidv4(),
    ...req.body,
    slug: req.body.slug || req.body.name.en.toLowerCase().replace(/\s+/g, '-')
  };
  
  categories.push(newCategory);
  saveData(categories, 'categories.json');
  
  res.status(201).json(newCategory);
});

app.put('/api/categories/:id', (req, res) => {
  const categoryIndex = categories.findIndex(c => c.id === req.params.id);
  if (categoryIndex === -1) {
    return res.status(404).json({ message: 'Category not found' });
  }
  
  const updatedCategory = {
    ...categories[categoryIndex],
    ...req.body,
    slug: req.body.slug || req.body.name.en.toLowerCase().replace(/\s+/g, '-')
  };
  
  categories[categoryIndex] = updatedCategory;
  saveData(categories, 'categories.json');
  
  res.json(updatedCategory);
});

app.delete('/api/categories/:id', (req, res) => {
  const categoryIndex = categories.findIndex(c => c.id === req.params.id);
  if (categoryIndex === -1) {
    return res.status(404).json({ message: 'Category not found' });
  }
  
  categories.splice(categoryIndex, 1);
  saveData(categories, 'categories.json');
  
  res.json({ message: 'Category deleted successfully' });
});

// Authentication (simple for demo purposes)
const users = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // In a real app, this would be hashed
    role: 'admin'
  }
];

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // In a real app, you would use JWT or sessions
  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    token: `fake-jwt-token-${user.id}`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`CMS API server running on port ${PORT}`);
});

module.exports = app;
