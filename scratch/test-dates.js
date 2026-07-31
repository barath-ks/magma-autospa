const testLogic = (reqDate, startTime) => {
  const shiftStart = new Date(`${reqDate}T${startTime}`);
  return (shiftStart.getTime() - Date.now() < 24 * 60 * 60 * 1000);
};

const now = new Date();

// 1. Right now
const d1 = new Date(now.getTime() + 1 * 60 * 60 * 1000); // 1 hr from now
const d1_local = new Date(d1.getTime() - d1.getTimezoneOffset() * 60000);
console.log('1 hr away rejected?', testLogic(d1_local.toISOString().split('T')[0], d1_local.toISOString().split('T')[1].substring(0,5)));

// 2. 23 hours from now
const d2 = new Date(now.getTime() + 23 * 60 * 60 * 1000); 
const d2_local = new Date(d2.getTime() - d2.getTimezoneOffset() * 60000);
console.log('23 hr away rejected?', testLogic(d2_local.toISOString().split('T')[0], d2_local.toISOString().split('T')[1].substring(0,5)));

// 3. 25 hours from now
const d3 = new Date(now.getTime() + 25 * 60 * 60 * 1000);
const d3_local = new Date(d3.getTime() - d3.getTimezoneOffset() * 60000);
console.log('25 hr away rejected?', testLogic(d3_local.toISOString().split('T')[0], d3_local.toISOString().split('T')[1].substring(0,5)));
