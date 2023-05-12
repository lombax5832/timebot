import { Chart, ChartConfiguration } from "chart.js";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
const palette = require("google-palette")

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
  while (arr.length) {
    const chunkSize = Math.ceil(arr.length / chunkCount--);
    const chunk = arr.slice(0, chunkSize);
    chunks.push(chunk);
    arr = arr.slice(chunkSize);
  }
  return chunks;
}

export const createChart = async (chart: ChartJSNodeCanvas, resultSet) => {
  const pal = palette('mpn65', resultSet.length).map(color => '#' + color)
  console.log("pal", pal)
  const configuration: any = {
    type: 'pie',
    data: {
      labels: resultSet.map(element => element.name),
      datasets: [{
        data: resultSet.map(element => element.duration),
        backgroundColor: pal,
      }]
    },
    options: {
      plugins: {
        datalabels: {
          color: 'black',
          font: {
            family: 'Arial'
          },
          formatter: function (value, context) {
            return context.chart.data.labels[context.dataIndex];
          }
        }
      },
      legend: {
        display: false,
      }
    },

  };
  Chart.overrides.pie.plugins.legend.display = false;
  const image = await chart.renderToBuffer(configuration);
  return image;
}