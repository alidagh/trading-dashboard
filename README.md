# trading-dashboard
Real-time trading dashboard. NESTJS on the backend serving tickers and mocked  
history over REST puls a SOCKET.IO gateway for live prices, React + Typescript  
on the front with Recharts for the chart. 

It's an npm workspaces monorepo:

```
contracts/      shared types, no runtine deps
backend/        the nest service 
frontend/       vite + react
k8s/            mainfests
```

The contracts package exsits so the REST payloads and socket event are writen once.  
If I change a price update, the frontend stops compiling. Worth the extra package. 

## Running the code 

``` 
docker compose up --build
```

Dashboard on http://localhost:5173, API on http://localhost:3000. 
Login is prefilled, `alidagh` / `ali@1234`.

Without docker (Node 20+):

``` 
npm install
npm run build -w @trading-dashboard/contracts
npm run start:dev -w @trading-dashboard/backend
npm run dev -w @trading-dashboard/frontend
```

Contracts has to build first or nothing else compiles, since both packages import it from dist.

One annoying thing: contracts compiles to CommonJS because Nest needs it, so Vite pre-bundles it  
and cache that. If you add something to contracts and the browser says the export doesn't exist,  
restart the dev server with `--force`. 
Cost me a while the first time. 

`VITE_API_URL` points the fronted at the API, defaults to localhost:3000. Vite bakes it into the  
bundle at build time so it has to be an address the browser can reach, not a compose service name. 

## API

Everything needs a token except login and /health. 

```
POST /auth/login
GET  /health 

GET  /tickers
GET  /tickers/:symbol/history?interval=1m|5m|30m|1h

GET  /alerts
POST /alerts
DELETE /alerts/:id
```

Socket: 

```
subscribe/unsubscribe {symbol}
price:update          {symbol, price, timestamp}
alert:triggered       the alert that fired
```

Token goes in the socket handshake, not a header. Subscribing sends one price straight away   
so the chart isn't empty while you wait for the first tick. 

## Tests 

```
npm test -w @trading-dashboard/backend 
```

44 tests, four suites. 
- TickerService covers the seed data, the generated series and the cache. 
- Auth Service covers login and token verificaiton including forged and expired ones. 
- The gateway covers subscribe/unsubscribe, room cleaupu and handshake rejecting a bak token. 
- AlertService covers the crossing logic and that alerts stay seperate per user. 

A few of these I only trust because I borke the code on purpose to check the test actually failed.   
Three of them didn't, so I rewrote them. The one I liked was flipping `>=` to `>` on the alert threshold  
and watching nothing go red. 

There are no frontend test. Vitest and testing-library are installled and the components take props so it  
wouldn't be hard, I just tested the UI by hand against a running backend and ran out the time. 

## Assumptions and trade-offs

Market data is fake. It's seeded random walk, walked backwards from the current price so the last candle  
always matches what a ticker list shows. Otherwise, the list and chart disagree and it looks broken. 

Everything is in memory. Prices, alerts, the cache. Restart and it all goes back to the seed values.  
No Database, didn't seem worth it for mocked data. 

History and the live feed are the same series. The backend keeps 1800 entries per ticker at 2-second spacing  
(one hour), and the websocket pushes the next entry onto it every 2 seconds.  
?interval=1m returns the last 30 entries, 1h returns all 1800. So the interval buttons pick how much of one   
series you see, rather than changing the candle size, and a chart seeded from REST then fed by the socket is  
continuous by construction.

Only the ticker you have selected updates live. The others sit at whatever price they had when /tickerswas fetched,  
so their change column stays at +0.00% until you click them. The backend is already moving every ticker on the same  
clock and emitting into each symbol's room, the client just isn't in those rooms,so the fix is to subscribe to all   
of them once the list loads instead of only the selected one. Small change, the hook takes one symbol today and would  
take a list. I ran out of time before doing it.


Auth is mocked. Real JWTs but a hardcoded secret and a hardcoded user list. The demo password is in the login  
form so it ends up in the bundle, wich is fine for a fake user and not something to copy. CORS is open, no refresh tokens.

Reconnects were fiddlier than expected. Socket.IO reconnects on its own but itcomes back with a new socket id so  
the room membership is gone server side. The hook resubscribes on connect. If the server disconnects you on purpose socket.io  
won't retry at all, so we treat that as a dead token and sign out.

## Bonus features 

All four done.  

**Auth.** Login returns a JWT, a guard protects the routes, the gateway checks the token on the handshake and  
sockets that failed. Login gate on the frontend, sessions in localStorage so a refresh keeps you in. 


**Caching.** History is a rolling buffer, so the cache sits in front of the slice rather than a generation step.  
Cached per symbol and interval with cache-manager, TTL from `HISTORY_CACHE_TTL_MS`, 2s by default.  
It used to be 60s back when each interval was generated on request, but the buffer moves every 2 seconds now  
so anything longer just serves a window that's visibly behind the live price. At 2s it still earns its keep,   
it collapses repeat requests inside one tick, but it's doing less than it was. Hits and misses get logged so you  
can watch it. 

**Alerts.** Pick a symbol, above or below a price. The server checks armed alerts on every tick and pushes the  
alert down the socket, so it fires even on symbols you're not subscribed to. 
Fires once and stays fired with the price that triggered it,  
otherwise it would spam every 2 seconds while the price sits on the threshold. 

**Kubernetes.** Deployments and services for both, an ingress and a secret for the signing key. Two hosts instead  
of one host with  an /api prefix because socket.io treats a path prefixed url as a namespace and not a path.

```
docker build -t trading-dashboard-backend:latest -f backend/Dockerfile . 
docker build -t trading-dashboard-frontend:latest \
 --build-arg VITE_API_URL=http://api.trading.local -f  frontend/Dockerfile . 

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
echo "127.0.0.1 trading.local api.trading.local" | sudo tee -a /etc/hosts
kubectl apply -f k8s/
```

Ran it on Docker Desktop's cluster. Backend is one replica on pupose, all the state is in the process so a second pod would  
run a completely seperate market and miss alerts armed on the other one.

Images are tagged latest with IfNotPresent, so after a rebuild you need a `kubectl rollout restart` or it quietly keeps the. 
old one. I found that out the hard way when the readiness probe kept 404ing on an image built before the health endpoint existed.  
Tagging with a git sha would be the better fix, I left it as is. 
