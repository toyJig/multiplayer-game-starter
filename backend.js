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
  console.log('a user connected')
  backendPlayers[socket.id] = {
    x: 500*Math.random(),
    y: 500*Math.random(),
    radius: 10,
    color: `hsl(${360*Math.random()}, 100%, 50%)`,
    sequenceNumber: 0,
    hp: 100
  }

  socket.on('emitCanvas', ({width, height}) => {
    backendPlayers[socket.id].canvas = {width, height}
  })

  socket.on('disconnect', (reason) =>{
    console.log(reason)
    delete backendPlayers[socket.id]
    io.emit('updatePlayers', backendPlayers)
  })

  io.emit('updatePlayers', backendPlayers)

  const PLAYER_SPEED = 5
  socket.on('keydown', ({keycode, sequenceNumber}) => {
    backendPlayers[socket.id].sequenceNumber = sequenceNumber
    switch(keycode){
      case 'KeyW':
        backendPlayers[socket.id].y-=PLAYER_SPEED
        break
      case 'KeyA':
        backendPlayers[socket.id].x-=PLAYER_SPEED
        break
      case 'KeyS':
        backendPlayers[socket.id].y+=PLAYER_SPEED
        break
      case 'KeyD':
        backendPlayers[socket.id].x+=PLAYER_SPEED
        break
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
        if (backendPlayers[playerId].hp <= 0) {
          backendPlayers[playerId].x = 500*Math.random()
          backendPlayers[playerId].y = 500*Math.random()
          backendPlayers[playerId].hp = 100
          io.emit('death', backendPlayers[playerId], playerId)
        }
        delete backendProjectiles[id]
    continue
      }
    }
    if (backendProjectile.x - PROJECTILE_SIZE >= backendPlayer?.canvas.width || 
      backendProjectile.y - PROJECTILE_SIZE >= backendPlayer?.canvas.height || 
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
