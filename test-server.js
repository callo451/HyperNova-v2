const fetch = require('node-fetch');

async function testServer() {
  try {
    console.log('Testing server...');
    
    // Test create endpoint
    console.log('Testing create endpoint...');
    const createResponse = await fetch('http://localhost:3002/api/games/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerId: 'test123',
        playerName: 'TestPlayer'
      })
    });
    
    const createData = await createResponse.json();
    console.log('Create response:', createData);
    
    if (createData.gameId) {
      // Test join endpoint
      console.log('Testing join endpoint...');
      const joinResponse = await fetch('http://localhost:3002/api/games/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gameId: createData.gameId,
          playerId: 'test456',
          playerName: 'TestPlayer2'
        })
      });
      
      const joinData = await joinResponse.json();
      console.log('Join response:', joinData);
    }
    
    console.log('Tests completed');
  } catch (error) {
    console.error('Error testing server:', error);
  }
}

testServer(); 