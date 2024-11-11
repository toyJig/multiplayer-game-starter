const PLAYER_SPEED = 5
const ARENA_SIZE = 800

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
        hp: backendPlayer.hp,
        score: backendPlayer.score
      })

      document.querySelector('#playerLabels').innerHTML += `<div data-id='${id}' data-score='${backendPlayer.score}'>${backendPlayer.username}: ${backendPlayer.score}</div>`
    } else { // if there is a player then update it
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backendPlayer.username}: ${backendPlayer.score}` 
      document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backendPlayer.score)

      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))
      childDivs.sort((a,b)=>{
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))
        return scoreB - scoreA
      })
      //remove old divs out of order
      childDivs.forEach(div =>{
        parentDiv.removeChild(div)
      })
      //appends new divs in sorted order
      childDivs.forEach(div =>{
        parentDiv.appendChild(div)
      })

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
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)
      delete frontEndPlayers[id]
    }
  }
})

socket.on('death', (player, playerId) => {
  if (playerId == socket.id){
    document.querySelector("#usernameInputForm").style.display = "initial"
  }
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
const PlayerInputs = []
let sequenceNumber = 0

setInterval(() => {
  if (frontEndPlayers[socket.id]){
    const player = frontEndPlayers[socket.id]
    sequenceNumber++
    PlayerInputs.push({sequenceNumber, dx: 0, dy: 0})
    const index = PlayerInputs.length-1
    socket.emit('keydown', { keys, sequenceNumber })
    if (keys.w){
      PlayerInputs[index].dy-=PLAYER_SPEED
    }
    if (keys.a){
      PlayerInputs[index].dx-=PLAYER_SPEED
    }
    if (keys.s){
      PlayerInputs[index].dy+=PLAYER_SPEED
    }
    if (keys.d){
        PlayerInputs[index].dx+=PLAYER_SPEED
    }        
    if (PlayerInputs[index].dx !=0 && PlayerInputs[index].dy != 0){
      PlayerInputs[index].dx /= Math.sqrt(2)
      PlayerInputs[index].dy /= Math.sqrt(2)
    }
    if (player.x + PlayerInputs[index].dx >= ARENA_SIZE || player.x + PlayerInputs[index].dx <= 0){
      PlayerInputs[index].dx = 0
    }
    if (player.y  + PlayerInputs[index].dy >= ARENA_SIZE || player.y + PlayerInputs[index].dy  <= 0){
      PlayerInputs[index].dy = 0
    }
    player.y += PlayerInputs[index].dy
    player.x += PlayerInputs[index].dx
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

document.querySelector("#usernameInputForm").addEventListener(("submit"), (event) => {
  event.preventDefault()
  document.querySelector("#usernameInputForm").style.display = "none"
  socket.emit("init", {width: canvas.width, height: canvas.height, devicePixelRatio, username: document.querySelector("#username").value})
})