const cluster = require('cluster');
const express = require('express')
const md5 = require('md5')
const app = express()
const port = 9000
const bodyParser = require('body-parser')
const goto = require('./controller')
const numCPUs = require('os').cpus().length

if (cluster.isMaster) {
    cluster.fork();
    cluster.fork();

} else{
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true }))
    var demoLogger = (request, res, next) => {
      const { rawHeaders, httpVersion, method, socket, url } = request;
      const { remoteAddress, remoteFamily } = socket;

      console.log(
        JSON.stringify({
          timestamp: Date.now(),
          rawHeaders,
          httpVersion,
          method,
          remoteAddress,
          remoteFamily,
          url
        })
      );
      next();
    };

    app.use(demoLogger);

    app.post('/androidapi/auth/login_relawan', goto.login_relawan)
    app.post('/androidapi/auth/login_posko_kecamatan', goto.login_posko_kecamatan)
    app.post('/androidapi/pemilih/add', goto.add_pemilih)
    app.post('/androidapi/pemilih/list', goto.list_pemilih)
    app.post('/androidapi/pemilih/add_batch', goto.add_batch_pemilih)
    app.post('/androidapi/relawan/add', goto.add_relawan)
    app.post('/androidapi/poskodesa/add', goto.add_posko_desa)
    app.post('/androidapi/relawan/list', goto.list_relawan)
    app.post('/androidapi/relawan/add_batch', goto.add_batch_relawan)
    app.post('/androidapi/user/update_loc', goto.update_loc)

    app.listen(port, () => {
        console.log(`App listening at http://localhost:${port}`)
    })
}


