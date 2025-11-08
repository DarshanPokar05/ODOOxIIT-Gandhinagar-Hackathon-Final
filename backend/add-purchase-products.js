const { pool } = require('./config/database');

const addPurchaseProducts = async () => {
  try {
    // Update existing products to have purchase type and add new purchase products
    await pool.query(`
      UPDATE products SET type_purchase = true WHERE name IN ('Software License', 'Cloud Hosting')
    `);

    // Add more purchase products
    const purchaseProducts = [
      ['Office Supplies', false, true, true, 0, 0, 25.00],
      ['Hardware Equipment', false, true, false, 0, 0, 500.00],
      ['Software Subscription', false, true, true, 0, 0, 99.00],
      ['Marketing Materials', false, true, true, 0, 0, 150.00],
      ['Training Services', false, true, false, 0, 0, 200.00]
    ];

    for (const product of purchaseProducts) {
      await pool.query(`
        INSERT INTO products (name, type_sales, type_purchase, type_expenses, sales_price, sales_tax_percent, cost_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (name) DO NOTHING
      `, product);
    }

    console.log('Purchase products added successfully');
  } catch (error) {
    console.error('Error adding purchase products:', error);
  }
};

addPurchaseProducts()
  .then(() => {
    console.log('Setup completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });