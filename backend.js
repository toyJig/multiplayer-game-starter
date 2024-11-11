const PLAYER_SPEED = 5
const ARENA_SIZE = 800

const { time } = require('console')
const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)

const { Server } = require('socket.io')
const io = new Server (server, {pingInterval: 2000, pingTimeout: 5000})

const port = 3000

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})


const backendPlayers = {}
const backendProjectiles = {}

let projectileId = 0

io.on('connection', (socket) => {
  console.log(`a user connected at ${new Date().toJSON().slice(0,10).replace(/-/g,'/')}`)
  socket.on('init', ({width, height, devicePixelRatio, username}) => {
    backendPlayers[socket.id] = {
      x: 500*Math.random(),
      y: 500*Math.random(),
      radius: 10,
      color: `hsl(${360*Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      hp: 100,
      score: 0,
      canvas: {width, height, devicePixelRatio},
      username
    }
    socket.on('disconnect', (reason) =>{
      console.log(reason)
      delete backendPlayers[socket.id]
      io.emit('updatePlayers', backendPlayers)
    })

    io.emit('updatePlayers', backendPlayers)
  })
  socket.on('keydown', ({keys, sequenceNumber}) => {
     if (backendPlayers[socket.id]){
      const player = backendPlayers[socket.id]
      backendPlayers[socket.id].sequenceNumber = sequenceNumber
      const movementRef = {dx: 0, dy: 0}
      if (keys.w){
        movementRef.dy-=PLAYER_SPEED
      }
      if (keys.a){
        movementRef.dx-=PLAYER_SPEED
      }
      if (keys.s){
        movementRef.dy+=PLAYER_SPEED
      }
      if (keys.d){
          movementRef.dx+=PLAYER_SPEED
      }  
      if (movementRef.dx !=0 && movementRef.dy != 0){
        movementRef.dx /= Math.sqrt(2)
        movementRef.dy /= Math.sqrt(2)
      }
      if (player.x + movementRef.dx >= ARENA_SIZE || player.x  + movementRef.dx <= 0){
        movementRef.dx = 0
      }
      if (player.y + movementRef.dy >= ARENA_SIZE || player.y + movementRef.dy  <= 0){
        movementRef.dy = 0
      }
      player.x+=movementRef.dx
      player.y+=movementRef.dy
    }
  })
  socket.on('shoot', ({x, y, angle}) => {
    projectileId++
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }
    backendProjectiles[projectileId] = {x, y, velocity, radius:5, playerId: socket.id}
  })
})

 

setInterval(()=>{
  //update and then emit projectile data
  for (const id in backendProjectiles) {
    const backendProjectile = backendProjectiles[id] 
    const backendPlayer = backendPlayers[backendProjectile.playerId]
    backendProjectile.x += backendProjectile.velocity.x
    backendProjectile.y += backendProjectile.velocity.y
    const PROJECTILE_SIZE = 5
    for (const playerId in backendPlayers) {
      if ((backendProjectile.playerId != playerId) && (Math.sqrt(Math.pow(backendProjectile.x-backendPlayers[playerId].x, 2) + Math.pow(backendProjectile.y-backendPlayers[playerId].y, 2)) < backendProjectile.radius+backendPlayers[playerId].radius)){
        backendPlayers[playerId].hp-=20
        if (backendPlayers[backendProjectile.playerId]){
          backendPlayers[backendProjectile.playerId].score+=10
        }
        if (backendPlayers[playerId].hp <= 0) {
          // backendPlayers[playerId].x = 500*Math.random()
          // backendPlayers[playerId].y = 500*Math.random()
          // backendPlayers[playerId].hp = 100
          delete backendPlayers[playerId]
          io.emit('death', backendPlayers[playerId], playerId)
        }
        delete backendProjectiles[id]
    continue
      }
    }
    if (backendProjectile.x - PROJECTILE_SIZE >= ARENA_SIZE || 
      backendProjectile.y - PROJECTILE_SIZE >= ARENA_SIZE || 
      backendProjectile.x + PROJECTILE_SIZE <= 0 || 
      backendProjectile.y + PROJECTILE_SIZE <= 0)  
    {
      delete backendProjectiles[id]
    }
  }
  io.emit('updateProjectiles', backendProjectiles) 
  io.emit('updatePlayers', backendPlayers)
}, 15)



//start the server
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
console.log("Server loaded") 
