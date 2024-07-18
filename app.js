const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const databasePath = path.join(__dirname, 'cricketMatchDetails.db')

const app = express()

app.use(express.json())

let database = null

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertdetailsDbObjectToResponseObject = dbObject => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  }
}

const convertmatchDbObjectToResponseObject = dbObject => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  }
}

const convertscoreDbObjectToResponseObject = dbObject => {
  return {
    playermatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  }
}

app.get('/players/', async (request, response) => {
  let allQuery = `
select *
from player_details
`
  const allArray = await database.all(allQuery)
  response.send(
    allArray.map(eachPlayer =>
      convertdetailsDbObjectToResponseObject(eachPlayer),
    ),
  )
})

app.get('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  let allQuery = `
select *
from player_details
where player_id = ${playerId};
`
  const allArray = await database.get(allQuery)
  response.send(convertdetailsDbObjectToResponseObject(allArray))
})

app.put('/players/:playerId/', async (request, response) => {
  let {playerId} = request.params
  let {playerName} = request.body

  const updateQuery = `
    UPDATE 
      player_details
    SET 
      player_name = ?
    WHERE 
      player_id = ?
  `

  try {
    await database.run(updateQuery, [playerName, playerId])
    response.send('Player Details Updated')
  } catch (error) {
    response.status(500).send({error: error.message})
  }
})

app.get(`/matches/:matchId/`, async (request, response) => {
  let {matchId} = request.params
  const partMatch = `
  select *
  from match_details
  where match_id= ${matchId};
  `
  const partArr = await database.get(partMatch)

  response.send(convertmatchDbObjectToResponseObject(partArr))
})

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params
  let allMatchesQuery = `
  select *
  from player_match_score
  natural join match_details
  where player_id = ${playerId}
  `
  const scoreArray = await database.all(allMatchesQuery)

  response.send(
    scoreArray.map(eachMatch =>
      convertmatchDbObjectToResponseObject(eachMatch),
    ),
  )
})

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params
  let allMatchesQuery = `
  select *
  from player_match_score
  natural join player_details
  where match_id = ${matchId}
  `
  const scoreArray = await database.all(allMatchesQuery)
  response.send(
    scoreArray.map(eachMatch =>
      convertdetailsDbObjectToResponseObject(eachMatch),
    ),
  )
})

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params
  let queryu = `
      SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
  `
  const speciArray = await database.get(queryu)
  response.send(speciArray)
})

module.exports = app
