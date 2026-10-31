'use strict';
const http=require('node:http'),path=require('node:path');const {Store,ApiError}=require('./store.cjs');
class Limiter{
  constructor(){this.entries=new Map();}
  use(key,limit,windowMs){const now=Date.now();let e=this.entries.get(key);if(!e||e.until<now){e={n:0,until:now+windowMs};this.entries.set(key,e);}if(++e.n>limit)throw new ApiError(429,'Demasiadas tentativas. Aguarda e tenta novamente.');if(this.entries.size>10000)this.entries.delete(this.entries.keys().next().value);}
}
async function readBody(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>600000)throw new ApiError(413,'Pedido demasiado grande.');chunks.push(chunk);}try{const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();return parsed;}catch{throw new ApiError(400,'Pedido JSON inválido.');}}
function createAuthServer({store,dbPath,logger=()=>{}}={}){
  const database=store||new Store(dbPath||process.env.NOX_AUTH_DB||path.join(__dirname,'data','auth.sqlite'));const limiter=new Limiter();let pendingPasswords=0;
  const server=http.createServer(async(req,res)=>{
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    let status=200;
    try{
      const route=new URL(req.url,'http://localhost').pathname,method=req.method;const ip=req.socket.remoteAddress||'unknown';
      limiter.use('all:'+ip,300,60000);
      if(method==='GET'&&route==='/health'){res.end(JSON.stringify({ok:true,service:'NoxTheK1ng accounts',version:'0.5.0'}));return;}
      if(!['GET','POST','PATCH'].includes(method))throw new ApiError(405,'Método não permitido.');
      const body=method==='GET'?{}:await readBody(req);
      if(method!=='GET'&&!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new ApiError(415,'Usa application/json.');
      const auth=req.headers.authorization||'',token=auth.startsWith('Bearer ')?auth.slice(7):'';
      let result;
      if(method==='POST'&&['/v1/register','/v1/login','/v1/password'].includes(route)){
        limiter.use('auth:'+ip,60,15*60000);limiter.use('name:'+ip+':'+String(body.username||token).toLowerCase().slice(0,100),12,15*60000);
        if(pendingPasswords>=8)throw new ApiError(429,'O serviço está ocupado. Tenta dentro de alguns segundos.');
        pendingPasswords++;
        try{if(route==='/v1/register'){result=await database.register(body);status=201;}else if(route==='/v1/login')result=await database.login(body);else result=await database.changePassword(token,body);}finally{pendingPasswords--;}
      }else if(method==='GET'&&route==='/v1/me')result={profile:database.me(token)};
      else if(method==='PATCH'&&route==='/v1/profile')result={profile:database.updateProfile(token,body)};
      else if(method==='POST'&&route==='/v1/redeem'){limiter.use('redeem:'+ip,15,15*60000);result={profile:database.redeem(token,body.key)};}
      else if(method==='POST'&&route==='/v1/logout'){database.logout(token);result={loggedOut:true};}
      else throw new ApiError(404,'Rota não encontrada.');
      res.statusCode=status;res.end(JSON.stringify({ok:true,...result}));
    }catch(error){status=error instanceof ApiError?error.status:500;res.statusCode=status;if(status===429)res.setHeader('Retry-After','60');res.end(JSON.stringify({ok:false,error:status===500?'O serviço não conseguiu concluir o pedido.':error.message}));logger({status,route:String(req.url).split('?')[0].slice(0,100),method:req.method});}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  return {server,store:database};
}
if(require.main===module){const {server,store}=createAuthServer({logger:e=>console.error('Pedido falhado:',e.status,e.method,e.route)});const host=process.env.NOX_AUTH_HOST||'127.0.0.1',port=Number(process.env.NOX_AUTH_PORT||process.env.PORT||4280);server.listen(port,host,()=>{console.log(`NoxTheK1ng contas e keys: http://${host}:${port}`);console.log('Base de dados: '+path.resolve(process.env.NOX_AUTH_DB||path.join(__dirname,'data','auth.sqlite')));console.log('Mantém esta janela aberta para o serviço funcionar. Usa admin.cjs para gerar keys.');});for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>{store.close();process.exit(0);}));}
module.exports={createAuthServer};
