import './config.js';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Candidate } from './model.js';

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

export async function seedIfEmpty() {
  const count = await Candidate.countDocuments();
  if (count) {
    console.log('Existing records found; demo seed skipped.');
    return 0;
  }
  const records = data.map(([name, role, skills, stage, location, experience], i) => {
    const [first, last] = name.toLowerCase().split(' ');
    const interviewAt = stage === 'Interview' ? new Date(Date.now() + (i % 5 + 1) * 86400000) : null;
    return {
      name, role, skills: skills.split(','), stage, location, experience, interviewAt,
      email: first + '.' + last + '@example.com',
      phone: '', source: i % 3 === 0 ? 'LinkedIn' : 'Careers page',
      history: [
        { to: 'Applied', at: new Date(Date.now() - 7 * 86400000) },
        ...(stage !== 'Applied' ? [{ from: 'Applied', to: stage, at: new Date() }] : []),
      ],
      notes: i % 4 === 0 ? [{ text: 'Demo recruiter note — sample data only.' }] : [],
      createdAt: new Date(Date.now() - (i + 1) * 86400000),
    };
  });
  await Candidate.insertMany(records);
  console.log('Seeded ' + records.length + ' fictional candidates.');
  return records.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const optional = process.argv.includes('--if-empty');
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set. ' + (optional ? 'Optional demo seed skipped.' : 'Configure it in .env.'));
    if (!optional) process.exitCode = 1;
  } else {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        dbName: 'hireline',
        serverSelectionTimeoutMS: 12000,
      });
      await seedIfEmpty();
    } catch (error) {
      console.error('Demo seed failed: ' + error.message);
      if (!optional) process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  }
}
