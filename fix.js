require('dotenv').config();
const bcrypt = require('bcryptjs');

async function fixAllPasswords() {
    try {
        console.log("--- Fixing ALL Passwords in Database ---");

        let User;
        try {
            User = require('./models').User;
        } catch (e) {
            User = require('./models/User');
        }

        const users = await User.findAll();
        let updatedCount = 0;

        for (let user of users) {
            // Check if the password is NOT already encrypted
            // bcrypt hashes always start with "$2a$" or "$2b$" or "$2y$"
            if (!user.password.startsWith('$2')) {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await User.update(
                    { password: hashedPassword },
                    { where: { id: user.id } }
                );
                updatedCount++;
            }
        }

        console.log(`✅ SUCCESS: Encrypted passwords for ${updatedCount} users!`);
        console.log("All 'Quick Demo Login' buttons will now work perfectly.");
        process.exit(0);
    } catch (error) {
        console.error("❌ ERROR:");
        console.error(error.message);
        process.exit(1);
    }
}

fixAllPasswords();