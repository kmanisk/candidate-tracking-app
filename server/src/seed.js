import './config.js';
import mongoose from 'mongoose';
import { Candidate } from './model.js';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required to seed demo records');
  process.exit(1);
}

const data = [
  ['Alex Morgan', 'Frontend Engineer', 'React,TypeScript,CSS', 'Interview', 'Bengaluru', 4],
  ['Taylor Brooks', 'Full Stack Developer', 'React,Node.js,MongoDB', 'Screening', 'Pune', 3],
  ['Jordan Lee', 'Backend Engineer', 'Node.js,Express,PostgreSQL', 'Applied', 'Hyderabad', 5],
  ['Casey Rivera', 'Product Designer', 'Figma,Prototyping,UX', 'Selected', 'Remote', 6],
  ['Sam Patel', 'Full Stack Developer', 'React,TypeScript,Express', 'Interview', 'Jaipur', 2],
  ['Jamie Chen', 'DevOps Engineer', 'AWS,Docker,CI/CD', 'Rejected', 'Delhi', 4],
  ['Robin Shah', 'Data Analyst', 'Python,SQL,Power BI', 'Applied', 'Mumbai', 2],
  ['Morgan Cruz', 'Frontend Engineer', 'React,Next.js,Tailwind', 'Screening', 'Chennai', 5],
  ['Devin Park', 'Backend Engineer', 'Rust,PostgreSQL,Redis', 'Interview', 'Remote', 3],
  ['Avery Singh', 'Product Designer', 'Figma,Research,UI', 'Applied', 'Gurugram', 4],
  ['Quinn Foster', 'Full Stack Developer', 'MERN,TypeScript,REST', 'Selected', 'Pune', 5],
  ['Riley Thomas', 'Frontend Engineer', 'JavaScript,React,Accessibility', 'Screening', 'Bengaluru', 2],
  ['Skyler Rao', 'DevOps Engineer', 'Linux,Kubernetes,Terraform', 'Applied', 'Jaipur', 5],
  ['Drew Kapoor', 'Data Analyst', 'Python,Excel,SQL', 'Rejected', 'Noida', 1],
  ['Harper Kim', 'Full Stack Developer', 'React,Node.js,Mongoose', 'Interview', 'Remote', 4],
  ['Reese Ahmed', 'Backend Engineer', 'Express,Node.js,Redis', 'Screening', 'Hyderabad', 3],
];

await mongoose.connect(process.env.MONGODB_URI, { dbName: 'hireline', serverSelectionTimeoutMS: 12000 });
try {
  const count = await Candidate.countDocuments();
  if (count && process.argv.includes('--if-empty')) {
    console.log('Existing records found; seed skipped.');
  } else if (count) {
    console.log('Existing records found; seed refused to avoid duplicates.');
  } else {
    const records = data.map(([name, role, skills, stage, location, experience], i) => {
      const [first, last] = name.toLowerCase().split(' ');
      const interviewAt = stage === 'Interview' ? new Date(Date.now() + (i % 5 + 1) * 86400000) : null;
      return {
        name, role, skills: skills.split(','), stage, location, experience, interviewAt,
        email: first + '.' + last + '@example.com',
        phone: '', source: i % 3 === 0 ? 'LinkedIn' : 'Careers page',
        history: [{ to: 'Applied', at: new Date(Date.now() - 7 * 86400000) }, ...(stage !== 'Applied' ? [{ from: 'Applied', to: stage, at: new Date() }] : [])],
        notes: i % 4 === 0 ? [{ text: 'Demo recruiter note — sample data only.' }] : [],
        createdAt: new Date(Date.now() - (i + 1) * 86400000),
      };
    });
    await Candidate.insertMany(records);
    console.log('Seeded ' + records.length + ' fictional candidates.');
  }
} finally {
  await mongoose.disconnect();
}
