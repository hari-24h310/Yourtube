export async function up({ mongoose }) {
  console.log('Creating indexes for users collection');
  const db = mongoose.connection.db;
  try {
    await db.collection('users').createIndex({ firebaseUid: 1 }, { sparse: true });
    console.log('Created index on firebaseUid');
  } catch (err) {
    console.warn('Could not create index on firebaseUid:', err.message);
  }
}

export async function down({ mongoose }) {
  const db = mongoose.connection.db;
  try {
    await db.collection('users').dropIndex('firebaseUid_1');
    console.log('Dropped index firebaseUid_1');
  } catch (err) {
    console.warn('Could not drop index firebaseUid_1:', err.message);
  }
}
