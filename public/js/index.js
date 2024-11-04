const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io()

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio

const x = canvas.width / 2
const y = canvas.height / 2

const frontEndPlayers = {}

socket.on('updatePlayers', (backendPlayers) => {
  for (const id in backendPlayers){
    const backendPlayer = backendPlayers[id]
    //adds player to player list if frontend doesn't have it but backend does
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backendPlayer.x, 
        y: backendPlayer.y, 
        radius: backendPlayer.radius, 
        color: backendPlayer.color
      })
    } else { // if there is a player then update its position
      //do server reconciliation if it is your player
      if (id === socket.id) {
        frontEndPlayers[id].x = backendPlayer.x
        frontEndPlayers[id].y = backendPlayer.y
        //find the movement related to the sequenceNumber the server thinks you're at
        const lastBackendInputIndex = PlayerInputs.findIndex(input => {
          return backendPlayer.sequenceNumber === input.sequenceNumber
        })
        //remove the already performed on server movements from the list of past movements
        console.log(lastBackendInputIndex)
        if (lastBackendInputIndex > -1){
          PlayerInputs.splice(0, lastBackendInputIndex+1)
        }
        //"reconcile"
        PlayerInputs.forEach(input => {
          frontEndPlayers[id].x += input.dx
          frontEndPlayers[id].y += input.dy
        })
      }else{
        gsap.to(frontEndPlayers[id], {
          x: backendPlayer.x,
          y: backendPlayer.y,
          duration: 15/1000,
          ease: 'sine'
        })
      }
    }
  }
  //deletes player if frontend has it but recieved backend info doesn't
  for (const id in frontEndPlayers){
    if (!backendPlayers[id]){
      delete frontEndPlayers[id]
    }
  }
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)
  for (const id in frontEndPlayers){
    const player = frontEndPlayers[id]
    player.draw()
  }
}

animate()

const keys = {
  w: false,
  a: false,
  s: false,
  d: false
}
const PLAYER_SPEED = 5
const PlayerInputs = []
let sequenceNumber = 0

setInterval(() => {
  if (keys.w) {
    frontEndPlayers[socket.id].y-=PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({sequenceNumber, dx: 0, dy: -PLAYER_SPEED})
    socket.emit('keydown', {keycode: 'KeyW', sequenceNumber})
  }
  if (keys.a) {
    frontEndPlayers[socket.id].x-=PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({sequenceNumber, dx: -PLAYER_SPEED, dy: 0})
    socket.emit('keydown', {keycode: 'KeyA', sequenceNumber})
  }
  if (keys.s) {
    frontEndPlayers[socket.id].y+=PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({sequenceNumber, dx: 0, dy: PLAYER_SPEED})
    socket.emit('keydown', {keycode: 'KeyS', sequenceNumber})
  }
  if (keys.d) {
    frontEndPlayers[socket.id].x+=PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({sequenceNumber, dx: PLAYER_SPEED, dy: 0})
    socket.emit('keydown', {keycode: 'KeyD', sequenceNumber})
  }
}, 15);

window.addEventListener('keydown', (event) => {
  console.log(event)
  if (!frontEndPlayers[socket.id]) return
  switch(event.code){
    case 'KeyW':
      keys.w = true
      break
    case 'KeyA':
      keys.a = true
      break
    case 'KeyS':
      keys.s = true
      break
    case 'KeyD':
      keys.d = true
      break
  }
})

window.addEventListener('keyup', (event) => {
  console.log(event)
  if (!frontEndPlayers[socket.id]) return
  switch(event.code){
    case 'KeyW':
      keys.w = false
      break
    case 'KeyA':
      keys.a = false
      break
    case 'KeyS':
      keys.s = false
      break
    case 'KeyD':
      keys.d = false
      break
  }
})