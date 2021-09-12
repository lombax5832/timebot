export const dateWithTimeZone = (timeZone, year, month, day, hour, minute, second) => {
    let date = new Date(Date.UTC(year, month, day, hour, minute, second));

    let utcDate = new Date(date.toLocaleString('en-US', { timeZone: "UTC" }));
    let tzDate = new Date(date.toLocaleString('en-US', { timeZone: timeZone }));
    let offset = utcDate.getTime() - tzDate.getTime();

    date.setTime(date.getTime() + offset);

    return date;
};

export function chunkArray(arr, chunkCount) {
    const chunks = [];
    while(arr.length) {
      const chunkSize = Math.ceil(arr.length / chunkCount--);
      const chunk = arr.slice(0, chunkSize);
      chunks.push(chunk);
      arr = arr.slice(chunkSize);
    }
    return chunks;
  }