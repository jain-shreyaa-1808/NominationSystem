/**
 * Seed script: creates default categories and admin user.
 * Run with:  cd backend && npm run seed
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Category = require('./models/Category');

const DEFAULT_CATEGORIES = [
  { name: 'Star Performer',        description: 'Consistent high performance and going above & beyond', order: 1 },
  { name: 'Innovation Champion',   description: 'Creative thinking and innovative problem-solving',      order: 2 },
  { name: 'Best Team Player',      description: 'Exceptional collaboration and team spirit',             order: 3 },
  { name: 'Customer Excellence',   description: 'Outstanding customer satisfaction and service',         order: 4 },
  { name: 'Leadership Excellence', description: 'Outstanding leadership and people development',          order: 5 },
  { name: 'Quality & Process',     description: 'Commitment to quality and process improvement',         order: 6 },
];

const ADMIN_EMAIL    = 'admin@company.com';
const ADMIN_PASSWORD = 'Admin@123';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Categories
    await Category.deleteMany({});
    const cats = await Category.insertMany(DEFAULT_CATEGORIES);
    console.log('✅ Categories seeded:');
    cats.forEach((c) => console.log(`   [${c.order}] ${c.name}`));

    // Admin user
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`\n⚠️  Admin already exists: ${ADMIN_EMAIL}`);
    } else {
      const admin = new User({
        name: 'System Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        passwordSet: true,
        role: 'admin',
        isActive: true,
      });
      await admin.save(); // triggers bcrypt hash
      console.log(`\n✅ Admin created`);
    }

    console.log('\n======================================');
    console.log(' SEED COMPLETE');
    console.log('======================================');
    console.log(` Admin email  : ${ADMIN_EMAIL}`);
    console.log(` Admin pass   : ${ADMIN_PASSWORD}`);
    console.log(' Change the password after first login!');
    console.log('======================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
