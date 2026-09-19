const fs = require('fs');
async function run() {
  const url = "https://jvazjeossypxrprdqmpk.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2YXpqZW9zc3lweHJwcmRxbXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2NDMzMDYsImV4cCI6MjEwMjIxOTMwNn0.ss0JJ8a-FItAL9FyZ9EHK3OfBCTFFtiw5BX96h0ZK7A";
  const res = await fetch(url);
  const data = await res.json();
  const ordersSchema = data.definitions.orders;
  console.log(JSON.stringify(ordersSchema, null, 2));
}
run();
