
// Convert each value to a number where applicable
export const convertFormValuesToNumbers = (formValues: Record<string, any>) => {
 return Object.keys(formValues).reduce((acc, key) => {
    const value = formValues[key];

    // Convert if it's a valid number
    acc[key] = isNaN(value) || value === '' ? value : Number(value);

    return acc;
  }, {} as Record<string, any>);
}
