export const GRADE_POINTS = {
  'O': 10.0,  // Some universities use O for Outstanding
  'A+': 10.0,
  'A': 9.0,
  'B+': 8.0,
  'B': 7.0,
  'C+': 6.0,
  'C': 5.0,
  'D': 4.0,
  'E': 0.0,
  'F': 0.0,
  'I': 0.0,
  'X': 0.0
};

export const GRADES = [
  { grade: 'O',  label: 'Outstanding', points: 10.00 },
  { grade: 'A+', label: 'Outstanding', points: 10.00 },
  { grade: 'A',  label: 'Excellent',   points: 9.00 },
  { grade: 'B+', label: 'Very Good',   points: 8.00 },
  { grade: 'B',  label: 'Good',        points: 7.00 },
  { grade: 'C+', label: 'Average',     points: 6.00 },
  { grade: 'C',  label: 'Below Average', points: 5.00 },
  { grade: 'D',  label: 'Marginal',    points: 4.00 },
  { grade: 'E',  label: 'Exposed',     points: 0.00 },
  { grade: 'F',  label: 'Poor',        points: 0.00 },
  { grade: 'I',  label: 'Incomplete',  points: 0.00 },
  { grade: 'X',  label: 'Not Registered', points: 0.00 },
];

export const VALID_GRADES = Object.keys(GRADE_POINTS);

export const calculateSGPA = (subjects) => {
  let totalCredits = 0;
  let weightedPoints = 0;

  subjects.forEach(sub => {
    const credits = parseFloat(sub.credits) || 0;
    const grade = sub.grade ? sub.grade.toUpperCase() : '';
    const points = GRADE_POINTS[grade] !== undefined ? GRADE_POINTS[grade] : 0;
    
    if (grade && !isNaN(credits) && credits > 0) {
      totalCredits += credits;
      weightedPoints += (credits * points);
    }
  });

  if (totalCredits === 0) return 0.00;
  return parseFloat((weightedPoints / totalCredits).toFixed(2));
};

// Alias for compatibility
export const calcSGPA = calculateSGPA;
