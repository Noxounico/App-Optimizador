'use strict';
const path=require('node:path'),readline=require('node:readline/promises');const {stdin,stdout}=require('node:process');const {Store}=require('./store.cjs');
(async()=>{const db=new Store(process.env.NOX_AUTH_DB||path.join(__dirname,'data','auth.sqlite'));try{const [command,...args]=process.argv.slice(2);if(!command||command==='wizard'){
  const rl=readline.createInterface({input:stdin,output:stdout});try{console.log('\nNOXTHEK1NG / GERAR KEY DE ACESSO\n');const raw=(await rl.question('Duracao em dias (Enter = vitalicia): ')).trim();const days=raw===''?null:Number(raw);const label=await rl.question('Nota interna (opcional): ');const deadline=(await rl.question('Prazo para resgatar em dias (Enter = sem prazo): ')).trim();const key=db.createKey({days,label,redeemDays:deadline===''?null:Number(deadline)});console.log('\nKEY (copia e entrega ao utilizador):\n\n'+key.key+'\n\nID: '+key.id+'\nEsta key so pode ser resgatada uma vez.\n');await rl.question('Prima Enter para fechar.');}finally{rl.close();}
}else if(command==='create-key'){const days=args[0]&&args[0]!=='lifetime'?Number(args[0]):null;console.log(JSON.stringify(db.createKey({days,label:args.slice(1).join(' ')}),null,2));}
else if(command==='list-keys')console.table(db.listKeys());
else if(command==='list-users')console.table(db.listUsers());
else if(command==='revoke-key'){const changed=db.revokeKey(args[0]);console.log(changed?'Key revogada.':'Key nao encontrada, ou ja resgatada. Para uma key ja resgatada, desativa a conta.');}
else if(command==='revoke-user'){db.revokeUser(args[0]);console.log('Conta desativada e sessoes invalidadas.');}
else if(command==='reset-password'){const temporary=await db.resetPassword(args[0]);console.log('Palavra-passe temporaria (entrega apenas ao titular): '+temporary+'\nTodas as sessoes foram terminadas. O titular deve altera-la no perfil.');}
else throw new Error('Comandos: wizard | create-key [dias|lifetime] [nota] | list-keys | list-users | revoke-key ID | revoke-user UTILIZADOR | reset-password UTILIZADOR');
}finally{db.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
