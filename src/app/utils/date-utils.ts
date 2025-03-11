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
