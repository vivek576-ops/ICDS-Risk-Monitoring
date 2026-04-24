require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectPostgres } = require('./config/db');
const User = require('./models/User');

async function fixAllPasswords() {
    try {
        console.log('--- Fixing ALL Passwords in Database ---');

        await connectPostgres();

        const users = await User.findAll();
        let updatedCount = 0;

        for (let user of users) {
            const password = user.password || '';
            if (!password.startsWith('$2')) {
                const hashedPassword = await bcrypt.hash(password, 10);
                await user.update(
                    { password: hashedPassword },
                    { hooks: false }
                );
                updatedCount++;
            }
        }

        console.log(`✅ SUCCESS: Encrypted passwords for ${updatedCount} users!`);
        console.log("All 'Quick Demo Login' buttons will now work perfectly.");
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:');
        console.error(error.message);
        process.exit(1);
    }
}

fixAllPasswords();