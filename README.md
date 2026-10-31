# NoxTheK1ng · contas e keys · 0.5

Este é o serviço do proprietário. A app dos utilizadores não inclui a ferramenta de geração de keys nem uma palavra-passe de administrador. As operações de administração são feitas pelo proprietário no servidor, através de `admin.cjs`.

## O que está implementado

- Registo com key obrigatória e de um único resgate.
- Login com nome de utilizador e palavra-passe; não requer email ou Discord.
- Perfil com nome público, bio e fotografia PNG até 256 KB/512 px. A app recorta e reencoda as imagens antes de enviar.
- Keys temporárias (1–3650 dias) ou vitalícias; o prazo de acesso começa no resgate. Pode existir um prazo separado para a key ser resgatada.
- Renovação numa conta existente, mudança de palavra-passe, encerramento de sessão e revogação pelo proprietário.
- SQLite com transações para impedir dois resgates da mesma key. Passwords com scrypt e salt aleatório; keys e tokens guardados apenas como hashes.
- Sessões de 30 dias, até 10 sessões por conta, invalidadas por logout, mudança de palavra-passe, reposição ou revogação.
- Limites de pedidos/tentativas e de tamanho dos pedidos. Não são registados passwords, tokens ou keys nos logs HTTP.

## Railway — criar o serviço

O pacote está preparado, mas não foi publicado num projeto Railway: ainda não foi fornecido um projeto ou domínio público.

1. Coloca os ficheiros desta pasta num repositório GitHub teu, ou usa o Railway CLI com esta pasta como diretório de deploy. O `Dockerfile` deve ficar na raiz do serviço.
2. No Railway, cria um projeto e um serviço a partir desse repositório. Se usares o repositório completo do código da app, define o **Root Directory** para `service`.
3. Adiciona um **Volume** ao serviço e monta-o em **`/data`**. O Dockerfile já define `NOX_AUTH_DB=/data/auth.sqlite`. O volume tem de existir antes de começares a criar contas ou keys. Mantém uma única instância/replica com esta base SQLite.
4. Faz o deploy. O serviço usa a variável `PORT` fornecida pelo Railway e escuta em `0.0.0.0`.
5. Em Networking, gera o domínio público HTTPS. `GET https://TEU-SERVICO.up.railway.app/health` deve responder `ok: true`.
6. No ficheiro **`resources/app/auth-config.json`** da app Windows, muda `serverUrl` para esse domínio, por exemplo:

```json
{"serverUrl":"https://TEU-SERVICO.up.railway.app","deployment":"production"}
```

7. Reinicia a app e testa uma key criada nesse mesmo serviço. Só depois distribui a app dos utilizadores. Não distribuas o volume, a base de dados ou o kit do proprietário.

Para quem usa CLI: autentica-te no Railway por `railway login`, associa a pasta ao projeto com `railway link` e faz deploy com `railway up`. O login deve ser feito pelo titular da conta.

## Gerar e gerir keys no Railway

Abre uma sessão no serviço com **`railway ssh`**, a partir do projeto associado. Dentro do contentor:

```text
node admin.cjs wizard
```

O assistente pergunta a duração, uma nota interna e o prazo de resgate. A key em texto aparece uma única vez para a copiares e entregares ao utilizador.

Outros comandos, sempre dentro do serviço/volume correto:

```text
node admin.cjs create-key 30 cliente-um
node admin.cjs create-key lifetime cliente-vitalicio
node admin.cjs list-keys
node admin.cjs list-users
node admin.cjs revoke-key ID-DA-KEY
node admin.cjs revoke-user nome_utilizador
node admin.cjs reset-password nome_utilizador
```

Revogar uma key só afeta keys ainda não resgatadas. Para retirar acesso a uma conta já criada, usa `revoke-user`. `reset-password` cria uma palavra-passe temporária aleatória e termina as sessões; o titular deve alterá-la no perfil após entrar.

Não há endpoints HTTP públicos de administração. A lista de keys mostra IDs e estados, mas não recupera as keys em texto.

## Testar localmente em Windows

O kit do proprietário inclui `Iniciar-servidor.cmd` e `Gerar-key.cmd`, com runtime Node para não precisares de o instalar. Mantém a janela do serviço aberta. As keys e contas deste teste só existem na base local; não passam automaticamente para o Railway.

A app de pré-visualização aponta para `http://127.0.0.1:4280`. Noutros PCs, esse endereço aponta para o próprio PC: é necessário configurar o domínio HTTPS do Railway para distribuir a app.

Com Node 24 instalado:

```text
node server.cjs
node admin.cjs wizard
```

O serviço local escuta só em `127.0.0.1`. O `Dockerfile` é que o configura para `0.0.0.0` em alojamento. HTTP externo não é aceite pela app; só HTTP de loopback é permitido para testes locais.

## Dados e operação

O servidor guarda nome de utilizador, nome público, bio, fotografia normalizada, hashes de passwords/keys/tokens e datas de conta/licença. Usa o volume persistente e mantém backups. O domínio deve ter HTTPS válido. O limite por IP pode ser partilhado por utilizadores atrás do mesmo proxy; não são aceites cabeçalhos de IP arbitrários como prova de origem.

Este sistema gere contas e licenças de uso normal; uma aplicação desktop modificada por terceiros não constitui uma barreira inviolável contra adulteração. O servidor é a autoridade sobre os resgates e as contas.

## Documentação oficial

- Railway volumes: https://docs.railway.com/volumes
- Railway healthchecks: https://docs.railway.com/deployments/healthchecks
- Railway SSH: https://docs.railway.com/cli/ssh
- Node SQLite: https://nodejs.org/docs/latest-v24.x/api/sqlite.html

