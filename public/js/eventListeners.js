addEventListener('click', (event) => {
  if (frontEndPlayers[socket.id]){
    const angle = Math.atan2(
      event.clientY*window.devicePixelRatio - frontEndPlayers[socket.id].y,
      event.clientX*window.devicePixelRatio - frontEndPlayers[socket.id].x
    )
    const velocity = {
      x: Math.cos(angle) * 5,
      y: Math.sin(angle) * 5
    }
    socket.emit('shoot', {
      x: frontEndPlayers[socket.id].x,
      y: frontEndPlayers[socket.id].y,
      angle
    })
  }
})
