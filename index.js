const path = require('path')
const fs = require('fs');
const _ = require('highland')
const { devalpha } = require('devalpha')

/* Setup some constants */
const FILENAME    = 'MSFT.csv'
const START_DATE  = new Date('2012-12-01').getTime()
const END_DATE    = new Date('2017-12-30').getTime()

/* Create a new stream and point it to the data */
const stream = fs.createReadStream(path.resolve(FILENAME))

/* Create a pipeline for parsing the input */
const pipeline = _.pipeline(
  _.split(),
  _.map((item) => {
    const parsed = item.split(',')
    return {
      identifier: parsed[0],
      timestamp: new Date(parsed[1]).getTime(),
      open: parseFloat(parsed[2]),
      high: parseFloat(parsed[3]),
      low: parseFloat(parsed[4]),
      close: parseFloat(parsed[5])
    }
  }),
  _.filter((item) => item.timestamp >= START_DATE && item.timestamp <= END_DATE)
)

/* Denotes whether or not we've entered a position. */
let hasPosition = false

let i = 0

/* Initialize the stream! */
devalpha({
  startCapital: 100000,
  feeds: {
    msftStream: _(stream).through(pipeline)
  },
  dashboard: {
    active: true
  }
}, (context, action) => {
  if (action.type === 'msftStream') {

    if (i % 3 === 0) {
      if (hasPosition) {
        context.order({
          identifier: 'MSFT',
          price: action.payload.close,
          quantity: -1000
        })
        hasPosition = false
      } else {
        context.order({
          identifier: 'MSFT',
          price: action.payload.close,
          quantity: 1000
        })
        hasPosition = true
      }
    }

    i += 1

  }
})
.errors((err) => {
  /* Extract errors from the stream */
  console.log('Whoops!', err.message)
})
.each(({ state, action }) => {
  /* Consume the stream */
  console.log('Received action:', action.type)
})

/* Open devalpha.io in your browser to start the backtest */
console.log('Waiting for DevAlpha...')
