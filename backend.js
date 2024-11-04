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

io.on('connection', (socket) => {
  console.log('a user connected')
  backendPlayers[socket.id] = {
    x: 500*Math.random(),
    y: 500*Math.random(),
    radius: 10*Math.random()+5,
    color: `hsl(${360*Math.random()}, 100%, 50%)`,
    sequenceNumber: 0
  }

  socket.on('disconnect', (reason) =>{
    console.log(reason)
    delete backendPlayers[socket.id]
    io.emit('updatePlayers', backendPlayers)
  })

  io.emit('updatePlayers', backendPlayers)
  console.log(backendPlayers)

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
    console.log(backendPlayers)
  })
})

 

setInterval(()=>{
  io.emit('updatePlayers', backendPlayers)
}, 15)



//start the server
server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
console.log("Server loaded") 