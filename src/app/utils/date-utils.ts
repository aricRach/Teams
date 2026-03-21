export const formatDateToString = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0'); // Ensures two digits
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export const formatDateTimeToString = (date: Date) => {
  const formattedDate = formatDateToString(date);
  const hours = String(date.getHours()).padStart(2, '0'); // 24-hour format
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formattedDate} ${hours}:${minutes}`;
};

export const currentDate =  formatDateToString(new Date());
export const currentDateTime = () => formatDateTimeToString(new Date());


// Compare two date strings in "dd-mm-yyyy" format.
export const compareDates = (a: string, b: string) => {
  const [dayA, monthA, yearA] = a.split('-').map(Number);
  const [dayB, monthB, yearB] = b.split('-').map(Number);
  const dateA = new Date(yearA, monthA - 1, dayA);
  const dateB = new Date(yearB, monthB - 1, dayB);
  return dateA.getTime() - dateB.getTime();
}

export const compareDateWithToday= (dateString: string | undefined) => {
  if(!dateString) return -1;
  // 1. Split the "13-12-2025" string
  const [day, month, year] = dateString.split('-').map(Number);

  // 2. Create the Date object (Note: Months are 0-indexed, so subtract 1)
  const targetDate = new Date(year, month - 1, day);

  // 3. Get the current date and reset time to midnight for an accurate day-to-day comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  // 4. Compare
  if (targetDate.getTime() === today.getTime()) {
    return 0; // Dates are equal
  } else if (targetDate.getTime() < today.getTime()) {
    return -1; // Provided date is in the past
  } else {
    return 1; // Provided date is in the future
  }
}
