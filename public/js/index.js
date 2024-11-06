const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io()

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = innerWidth * devicePixelRatio
canvas.height = innerHeight * devicePixelRatio
addEventListener('onresize', () => {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
});


const frontEndPlayers = {}
const frontEndProjectiles = {}

socket.on('connect', () => {
  socket.emit('emitCanvas', { width: canvas.width, height: canvas.height })
})

socket.on('updateProjectiles', (backendProjectiles) => {
  for (const id in backendProjectiles) {
    const backendProjectile = backendProjectiles[id]
    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile(
        backendProjectile.x,
        backendProjectile.y,
        5,
        frontEndPlayers[backendProjectile.playerId]?.color,
        backendProjectile.velocity
      )
    } else {
      frontEndProjectiles[id].x += frontEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += frontEndProjectiles[id].velocity.y
    }
  }
  for (const id in frontEndProjectiles) {
    if (!backendProjectiles[id]) {
      delete frontEndProjectiles[id]
    }
  }
})

socket.on('updatePlayers', (backendPlayers) => {
  for (const id in backendPlayers) {
    const backendPlayer = backendPlayers[id]
    //adds player to player list if frontend doesn't have it but backend does
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backendPlayer.x,
        y: backendPlayer.y,
        radius: backendPlayer.radius,
        color: backendPlayer.color,
        hp: backendPlayer.hp
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
        if (lastBackendInputIndex > -1) {
          PlayerInputs.splice(0, lastBackendInputIndex + 1)
        }
        //"reconcile"
        PlayerInputs.forEach(input => {
          frontEndPlayers[id].x += input.dx
          frontEndPlayers[id].y += input.dy
        })
      } else {
        frontEndPlayers[id].hp = backendPlayer.hp
        gsap.to(frontEndPlayers[id], {
          x: backendPlayer.x,
          y: backendPlayer.y,
          duration: 15 / 1000,
          ease: 'sine'
        })
      }
    }
  }
  //deletes player if frontend has it but recieved backend info doesn't
  for (const id in frontEndPlayers) {
    if (!backendPlayers[id]) {
      delete frontEndPlayers[id]
    }
  }
})

socket.on('death', (player, playerId) => {
  frontEndPlayers[playerId].x = player.x
  frontEndPlayers[playerId].y = player.y
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.fillRect(0, 0, canvas.width, canvas.height)
  for (const id in frontEndPlayers) {
    const player = frontEndPlayers[id]
    player.draw()
  }
  for (const id in frontEndProjectiles) {
    const frontEndProjectile = frontEndProjectiles[id]
    frontEndProjectile.draw()
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
    frontEndPlayers[socket.id].y -= PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({ sequenceNumber, dx: 0, dy: -PLAYER_SPEED })
    socket.emit('keydown', { keycode: 'KeyW', sequenceNumber })
  }
  if (keys.a) {
    frontEndPlayers[socket.id].x -= PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({ sequenceNumber, dx: -PLAYER_SPEED, dy: 0 })
    socket.emit('keydown', { keycode: 'KeyA', sequenceNumber })
  }
  if (keys.s) {
    frontEndPlayers[socket.id].y += PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({ sequenceNumber, dx: 0, dy: PLAYER_SPEED })
    socket.emit('keydown', { keycode: 'KeyS', sequenceNumber })
  }
  if (keys.d) {
    frontEndPlayers[socket.id].x += PLAYER_SPEED
    sequenceNumber++
    PlayerInputs.push({ sequenceNumber, dx: PLAYER_SPEED, dy: 0 })
    socket.emit('keydown', { keycode: 'KeyD', sequenceNumber })
  }
}, 15);

window.addEventListener('keydown', (event) => {
  if (!frontEndPlayers[socket.id]) return
  switch (event.code) {
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
  if (!frontEndPlayers[socket.id]) return
  switch (event.code) {
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