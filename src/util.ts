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
  const configuration: any = {
    type: 'pie',
    data: {
      labels: resultSet.map(element => element.name.replace(/\\/g, '')),
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
            size: 15,
            weight: 'bold'
          },
          rotation: function (ctx) {
            const valuesBefore = ctx.dataset.data.slice(0, ctx.dataIndex).reduce((a, b) => a + b, 0);
            const sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const rotation = ((valuesBefore + ctx.dataset.data[ctx.dataIndex] / 2) / sum * 360);
            return rotation < 180 ? rotation - 90 : rotation + 90;
          },
          formatter: function (value, context) {
            return `[${(Math.round(resultSet[context.dataIndex].percentage)).toString()}%] ${context.chart.data.labels[context.dataIndex]}`;
          },
          display: function(context) {
            return (Math.round(resultSet[context.dataIndex].percentage)) >= 4;
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