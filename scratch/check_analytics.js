const mongoose = require('mongoose');
const fs = require('fs');

let env = '';
try { env = fs.readFileSync('.env.local', 'utf8'); } catch(e) { env = fs.readFileSync('.env', 'utf8'); }
const uriMatch = env.match(/MONGODB_URI=(.+)/);
const uri = uriMatch ? uriMatch[1].trim() : 'mongodb://localhost:27017/school_management';

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;

  const admins = await db.collection('users').find({ role: 'school_admin' }).project({ name: 1, email: 1, createdAt: 1 }).toArray();
  console.log('Admins count:', admins.length, admins);

  const studentCounts = await db.collection('students').aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('Student by month:', studentCounts);

  const teacherCounts = await db.collection('teachers').aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('Teacher by month:', teacherCounts);

  const feeStats = await db.collection('studentfeepayments').aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$payment_date' } }, total: { $sum: '$amount_paid' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('Fee by month:', feeStats);

  const totalFeeCollected = await db.collection('studentfeepayments').aggregate([
    { $group: { _id: null, total: { $sum: '$amount_paid' }, count: { $sum: 1 } } }
  ]).toArray();
  console.log('Total Fee Collected:', totalFeeCollected);

  const salaryStats = await db.collection('salarypayments').aggregate([
    { $group: { _id: '$salary_period', total: { $sum: '$final_salary' }, count: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$final_salary', 0] } } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  console.log('Salary by period:', salaryStats);

  const totalSalary = await db.collection('salarypayments').aggregate([
    { $group: { _id: null, total: { $sum: '$final_salary' }, count: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$final_salary', 0] } } } }
  ]).toArray();
  console.log('Total Salary Payouts:', totalSalary);

  const docStats = await db.collection('generateddocuments').aggregate([
    { $group: { _id: '$document_type', count: { $sum: 1 } } }
  ]).toArray();
  console.log('Docs by type:', docStats);

  const docCount = await db.collection('generateddocuments').countDocuments();
  console.log('Total generated docs:', docCount);

  // Sample student fee assignments or pending fees
  const feeAssignments = await db.collection('studentfeeassignments').countDocuments();
  console.log('Total student fee assignments:', feeAssignments);

  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
