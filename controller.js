'use strict';
const mysql = require('mysql');
const md5 = require('md5');
const uuid = require('uuid');
const dateFormat = require('dateformat');
const conn = require('./config');


var pool = mysql.createPool({
    connectionLimit: 10,
    host: '103.146.203.103',
    user: 'admin',
    password: '4kuG4kr0h`',
    database: 'reaksi'
});

var funGetTime = function() {
    return new Date(new Date().getTime() + (7 * 3600 * 1000));
}



var objKecamatan = {};
var objKelurahan = {};

exports.update_loc = function(req, res) {
    var tipe = req.body.tipe
    if (tipe == '1' || tipe == '2') {
        var param1 = "user_relawan";
        var param2 = "user_relawan.ur_id";
    } else if (tipe == '3' || tipe == '4') {
        var param1 = "user_saksi";
        var param2 = "user_saksi.us_id";
    }
    authorize(req, param1, param2, async function(result) {
        if (result.result == 'false') {
            res.status(200).send({
                result: 'false',
                message: 'User not found'
            })
        } else {
            var data = {};
            data['lo_latitude'] = req.body.latitude;
            data['lo_longitude'] = req.body.longitude;
            data['lo_us_id'] = result.data.se_us_id;
            data['lo_datetime'] = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss");
            data['lo_tipe'] = req.body.tipe;
            pool.query(createSqlInsert('user_location', data), function(error, results, fields) {
                if (error) {
                    res.status(200).send({
                        result: 'false',
                        message: 'Data gagal disimpan, Silahkan coba kembali'
                    })
                } else {
                    if (data['lo_tipe'] == '1' || data['lo_tipe'] == '2') {
                        var usr = {}
                        usr['ur_latitude'] = data['lo_latitude'];
                        usr['ur_longitude'] = data['lo_longitude'];
                        usr['ur_last_active'] = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss");

                        var sql = `UPDATE user_relawan
                        SET ur_latitude='${usr['ur_latitude']}', ur_longitude='${usr['ur_longitude']}', ur_last_active='${usr['ur_last_active']}'
                        WHERE ur_id='${data['lo_us_id']}' `;
                        pool.query(sql, function(error, results, fields) {
                            if (error) {
                                res.status(200).send({
                                    result: 'false',
                                    message: 'Data gagal disimpan, Silahkan coba kembali'
                                })
                            } else {
                                res.status(200).send({
                                    result: 'true',
                                    message: 'Data berhasil disimpan'
                                })
                            }
                        })
                    }
                }
            });

        }
    });


}
exports.list_relawan = function(req, res) {
    authorize(req, 'user_relawan', 'user_relawan.ur_id', function(result) {
        if (result.result == 'false') {
            res.status(200).send(result)
        } else {
            var sql = `SELECT ur_nama as nama, ur_nik as nik, ur_notelp as notelp, ur_kec_id as kecamatan, ur_kel_id as kelurahan, ur_rt as rt, ur_rw as rw, ur_password as password, ur_status as status, ur_latitude as latitude, ur_longitude as longitude
               FROM user_relawan WHERE  ur_created_by = '${result.data.ur_id}' AND ur_tipe=2 `;
            pool.query(sql, function(error, results, fields) {
                if (error) {
                    res.status(200).send({
                        result: 'false',
                        message: 'Server Error'
                    })
                } else {
                    var total = results.length;
                    var valid = results.filter((obj) => {
                        return obj.status == "VALID"
                    }).length
                    var tidak_valid = results.filter((obj) => {
                        return obj.status == "TIDAK VALID"
                    }).length
                    res.status(200).send({
                        result: 'true',
                        list: results,
                        total: total,
                        valid: valid,
                        tidak_valid: tidak_valid
                    })
                }
            });
        }
    })

}
exports.add_batch_relawan = function(req, res) {
    var db = conn.makeDb({
        host: '103.146.203.103',
        user: 'admin',
        password: '4kuG4kr0h`',
        database: 'reaksi'
    })
    var data = {
        list: req.body.list
    };
    if (isEmpty(data).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(data).data
        })
    } else {
        authorize(req, 'user_relawan', 'user_relawan.ur_id', async function(result) {
            if (result.result == 'false') {
                res.status(200).send({
                    result: 'false',
                    message: 'Data gagal disimpan, Silahkan coba kembali'
                })
            } else {
                try {
                    var json_decode = JSON.parse(data.list)
                    data.ur_pos_id = result.data.ur_pos_id
                    data.ur_kec_id = result.data.ur_kec_id
                    data.ur_kel_id = result.data.ur_kel_id
                    data.ur_created_by = result.data.ur_id
                    data.ur_created_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
                    await asyncForEach(json_decode, async function(obj) {
                        var cek = await db.query(`SELECT * FROM user_relawan WHERE ur_nik = '${obj['nik']}'`);
                        if (cek.length == 0) {
                            var tmp_value = {}
                            tmp_value['ur_nama'] = obj['nama'];
                            tmp_value['ur_nik'] = obj['nik'];
                            tmp_value['ur_notelp'] = obj['notelp'];
                            tmp_value['ur_kec_id'] = obj['kecamatan'];
                            tmp_value['ur_kel_id'] = obj['kelurahan'];
                            tmp_value['ur_rt'] = obj['rt'];
                            tmp_value['ur_rw'] = obj['rw'];
                            tmp_value['ur_status'] = 'VALID';
                            tmp_value['ur_pos_id'] = data['ur_pos_id'];
                            tmp_value['ur_tipe'] = '2';
                            tmp_value['ur_latitude'] = obj['latitude'];
                            tmp_value['ur_longitude'] = obj['longitude'];
                            tmp_value['ur_password'] = obj['password'];
                            tmp_value['ur_uid'] = uuid.v4().replace(/\-/g, '');
                            tmp_value['ur_created_by'] = data['ur_created_by'];
                            tmp_value['ur_created_at'] = data['ur_created_at'];
                            tmp_value['ur_updated_by'] = data['ur_created_by'];
                            tmp_value['ur_updated_at'] = data['ur_created_at'];
                            console.log(tmp_value)
                            await db.query(createSqlInsert('user_relawan', tmp_value));
                        }
                    });
                    await db.close();
                    res.status(200).send({
                        result: 'true',
                        message: 'Data berhasil disimpan'
                    })
                } catch (e) {
                    if (e instanceof SyntaxError) {
                        console.log(e, true);
                    } else {
                        console.log(e, false);
                    }
                    res.status(200).send({
                        result: 'false',
                        message: 'Data gagal disimpan, Silahkan coba kembali - Bad JSON'
                    })
                }

            }
        })
    }
}
exports.add_relawan = function(req, res) {
    var data = {
        ur_nama: req.body.nama,
        ur_nik: req.body.nik,
        ur_notelp: req.body.notelp,
        ur_kec_id: req.body.kecamatan,
        ur_kel_id: req.body.kelurahan,
        ur_rt: req.body.rt,
        ur_rw: req.body.rw,
        ur_latitude: req.body.latitude,
        ur_longitude: req.body.longitude,
        ur_password: req.body.password
    };
    if (isEmpty(data).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(data).data
        })
    } else {
        authorize(req, 'user_relawan', 'user_relawan.ur_id', function(result) {
            if (result.result == 'false') {
                res.status(200).send(result)
            } else {

                data.ur_status = 'VALID'
                data.ur_pos_id = result.data.ur_pos_id
                data.ur_tipe = '2'
                data.ur_uid = uuid.v4().replace(/\-/g, '')
                data.ur_created_by = result.data.ur_id
                data.ur_updated_by = result.data.ur_id
                data.ur_created_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
                data.ur_updated_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")

                pool.query(`SELECT * FROM user_relawan WHERE ur_nik='${data.ur_nik}'`, function(error, results, fields) {
                    if (error) {
                        res.status(200).send({
                            result: 'false',
                            message: 'Server Error'
                        })
                    } else {
                        if (results.length > 0) {
                            res.status(200).send({
                                result: 'false',
                                message: 'Data gagal disimpan, relawan sudah terdaftar'
                            })
                        } else {
                            pool.query(createSqlInsert('user_relawan', data), function(error, results, fields) {
                                if (error) {
                                    res.status(200).send({
                                        result: 'false',
                                        message: 'Data gagal disimpan, Silahkan coba kembali'
                                    })
                                } else {
                                    res.status(200).send({
                                        result: 'true',
                                        message: 'Data berhasil disimpan'
                                    })
                                }
                            });
                        }
                    }
                });
            }
        })
    }
}


exports.add_posko_desa = function(req, res) {

    var objData = {
        'kec_id': req.body.kecamatan,
        'kel_id': req.body.kelurahan,
        'kategori': req.body.kategori,
        'pos_nama': req.body.nama,
        'pos_nama_posko': req.body.nama_posko,
        'poskec_username': req.body.nik,
        'poskec_notelp': req.body.notelp,
        'password': req.body.password
    }

    if (isEmpty(objData).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(objData).data
        })
    } else {
        authorize(req, 'posko_kecamatan', 'posko_kecamatan.poskec_id', function(result) {
            if (result.result == 'false') {
                res.status(200).send(result)
            } else {
                pool.query(`SELECT * FROM posko_kecamatan WHERE (poskec_kec_id = "${objData.kec_id}" AND poskec_kategori = "${objData.kategori}")`, function(error, results, fields) {
                    if (error) {
                        res.status(200).send({
                            result: 'false',
                            message: 'Server Error'
                        })
                    } else {
                        if (results.length > 0) {
                            var objPoskoDesa = {
                                posdes_nama: req.body.nama,
                                posdes_nama_posko: req.body.nama_posko,
                                posdes_nik: req.body.nik,
                                posdes_kec_id: req.body.kecamatan,
                                posdes_kel_id: req.body.kelurahan,
                                posdes_notelp: req.body.notelp,
                                posdes_kategori: req.body.kategori,
                                posdes_password: req.body.password,
                                posdes_created_by: results[0]['poskec_id'],
                                posdes_updated_by: results[0]['poskec_id']
                            }
                            objPoskoDesa.posdes_created_at = dateFormat(new Date(), "yyyy-mm-d HH:MM:ss")
                            objPoskoDesa.posdes_updated_at = dateFormat(new Date(), "yyyy-mm-d HH:MM:ss")
                            objPoskoDesa.posdes_uid = uuid.v4().replace(/\-/g, '')
                            objPoskoDesa.posdes_poskec_id = results[0]['poskec_id']
                            pool.query(`SELECT * FROM posko_desa WHERE (posdes_kel_id = "${objPoskoDesa.posdes_kel_id}" AND posdes_kategori = "${objPoskoDesa.posdes_kategori}") OR posdes_nik = "${objPoskoDesa.posdes_nik}"`, function(error, results, fields) {
                                if (error) {
                                    res.status(200).send({
                                        result: 'false',
                                        message: 'Server Error'
                                    })
                                } else {
                                	if (results.length == 0) {
                                		pool.query(createSqlInsert('posko_desa', objPoskoDesa), function(error, results, fields) {
			                                if (error) {
			                                	console.log(error)
			                                    res.status(200).send({
			                                        result: 'false',
			                                        message: 'Data gagal disimpan, Silahkan coba kembali'
			                                    })
			                                } else {
			                                    res.status(200).send({
			                                        result: 'true',
			                                        message: 'Data berhasil disimpan'
			                                    })
			                                }
			                            });
                                	} else {
                                		res.status(200).send({
						                    'status': 'false',
						                    'message': 'Data / Akun Posko Sudah Ada'
						                })
                                	}
                                }
                            })

                        } else {
                            res.status(200).send({
                                result: 'false',
                                message: 'Data gagal disimpan, Posko Kecamatan Belum ada'
                            })
                        }
                    }
                })
/*
                data.ur_status = 'VALID'
                data.ur_pos_id = result.data.ur_pos_id
                data.ur_tipe = '2'
                data.ur_uid = uuid.v4().replace(/\-/g, '')
                data.ur_created_by = result.data.ur_id
                data.ur_updated_by = result.data.ur_id
                data.ur_created_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
                data.ur_updated_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")

                pool.query(`SELECT * FROM user_relawan WHERE ur_nik='${data.ur_nik}'`, function(error, results, fields) {
                    if (error) {
                        res.status(200).send({
                            result: 'false',
                            message: 'Server Error'
                        })
                    } else {
                        if (results.length > 0) {
                            res.status(200).send({
                                result: 'false',
                                message: 'Data gagal disimpan, relawan sudah terdaftar'
                            })
                        } else {
                            pool.query(createSqlInsert('user_relawan', data), function(error, results, fields) {
                                if (error) {
                                    res.status(200).send({
                                        result: 'false',
                                        message: 'Data gagal disimpan, Silahkan coba kembali'
                                    })
                                } else {
                                    res.status(200).send({
                                        result: 'true',
                                        message: 'Data berhasil disimpan'
                                    })
                                }
                            });
                        }
                    }
                });
                */
            }
        })
    }
}

exports.add_batch_pemilih = function(req, res) {
    var db = conn.makeDb({
        host: '103.146.203.103',
        user: 'admin',
        password: '4kuG4kr0h`',
        database: 'reaksi'
    })
    var data = {
        list: req.body.list
    };
    if (isEmpty(data).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(data).data
        })
    } else {
        authorize(req, 'user_relawan', 'user_relawan.ur_id', async function(result) {
            if (result.result == 'false') {
                res.status(200).send({
                    result: 'false',
                    message: 'Data gagal disimpan, Silahkan coba kembali'
                })
            } else {
                try {
                    var json_decode = JSON.parse(data.list)
                    data.pe_pos_id = result.data.ur_pos_id
                    data.pe_kec_id = result.data.ur_kec_id
                    data.pe_kel_id = result.data.ur_kel_id
                    data.pe_created_by = result.data.se_us_id
                    data.pe_created_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
                    await asyncForEach(json_decode, async function(obj) {
                        var cek = await db.query(`SELECT * FROM pemilih WHERE pe_nik = '${obj['nik']}'`);
                        if (cek.length == 0) {
                            var tmp_value = {}
                            tmp_value['pe_nama'] = obj['nama'];
                            tmp_value['pe_nik'] = obj['nik'];
                            tmp_value['pe_notelp'] = obj['notelp'];
                            tmp_value['pe_latitude'] = obj['latitude'];
                            tmp_value['pe_longitude'] = obj['longitude'];
                            tmp_value['pe_pos_id'] = data['pe_pos_id'];
                            tmp_value['pe_kec_id'] = data['pe_kec_id'];
                            tmp_value['pe_kel_id'] = data['pe_kel_id'];
                            tmp_value['pe_uid'] = uuid.v4().replace(/\-/g, '');
                            tmp_value['pe_created_by'] = data['pe_created_by'];
                            tmp_value['pe_created_at'] = data['pe_created_at'];
                            await db.query(createSqlInsert('pemilih', tmp_value));
                        }
                    });
                    await db.close();
                    res.status(200).send({
                        result: 'true',
                        message: 'Data berhasil disimpan'
                    })
                } catch (e) {
                    if (e instanceof SyntaxError) {
                        console.log(e, true);
                    } else {
                        console.log(e, false);
                    }
                    res.status(200).send({
                        result: 'false',
                        message: 'Data gagal disimpan, Silahkan coba kembali'
                    })
                }

            }
        })
    }
}
exports.list_pemilih = function(req, res) {
    authorize(req, 'user_relawan', 'user_relawan.ur_id', function(result) {
        if (result.result == 'false') {
            res.status(200).send(result)
        } else {
            var sql = `SELECT pe_nama as nama, pe_nik as nik, pe_notelp as notelp, pe_status as status, pe_latitude as latitude, pe_longitude as longitude
               FROM pemilih WHERE  pe_created_by = '${result.data.se_us_id}' `;
            pool.query(sql, function(error, results, fields) {
                if (error) {
                    res.status(200).send({
                        result: 'false',
                        message: 'Server Error'
                    })
                } else {
                    var total = results.length;
                    var valid = results.filter((obj) => {
                        return obj.status == "VALID"
                    }).length
                    var tidak_valid = results.filter((obj) => {
                        return obj.status == "TIDAK VALID"
                    }).length
                    res.status(200).send({
                        result: 'true',
                        list: results,
                        total: total,
                        valid: valid,
                        tidak_valid: tidak_valid
                    })
                }
            });
        }
    })

}
exports.add_pemilih = function(req, res) {
    var data = {
        pe_nama: req.body.nama,
        pe_nik: req.body.nik,
        pe_notelp: req.body.notelp,
        pe_latitude: req.body.latitude,
        pe_longitude: req.body.longitude
    };
    if (isEmpty(data).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(data).data
        })
    } else {
        authorize(req, 'user_relawan', 'user_relawan.ur_id', function(result) {
            if (result.result == 'false') {
                res.status(200).send(result)
            } else {

                data.pe_pos_id = result.data.ur_pos_id
                data.pe_kec_id = result.data.ur_kec_id
                data.pe_kel_id = result.data.ur_kel_id
                data.pe_uid = uuid.v4().replace(/\-/g, '')
                data.pe_created_by = result.data.se_us_id
                data.pe_created_at = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")

                pool.query(`SELECT * FROM pemilih WHERE pe_nik='${data.pe_nik}'`, function(error, results, fields) {
                    if (error) {
                        res.status(200).send({
                            result: 'false',
                            message: 'Server Error'
                        })
                    } else {
                        if (results.length > 0) {
                            res.status(200).send({
                                result: 'false',
                                message: 'Data gagal disimpan, pemilih sudah terdaftar'
                            })
                        } else {
                            pool.query(createSqlInsert('pemilih', data), function(error, results, fields) {
                                if (error) {
                                    res.status(200).send({
                                        result: 'false',
                                        message: 'Data gagal disimpan, Silahkan coba kembali'
                                    })
                                } else {
                                    res.status(200).send({
                                        result: 'true',
                                        message: 'Data berhasil disimpan'
                                    })
                                }
                            });
                        }
                    }
                });
            }
        })
    }
}

exports.login_posko_kecamatan = function(req, res) {
    var data = {
        nik: req.body.username,
        password: req.body.password,
        token: uuid.v4().replace(/\-/g, ''),
        apikey: uuid.v4().replace(/\-/g, '')
    };
    if (isEmpty(data).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(data).data
        })
    } else {
        var sql = `SELECT * FROM posko_kecamatan 
        			WHERE posko_kecamatan.poskec_username = "${data.nik}"`;

        pool.query(sql, function(error, results, fields) {
            if (error) {
                res.status(200).send({
                    result: 'false',
                    message: 'Server Error'
                })
            } else {
                if (results.length == 1) {
                    if (results[0]['poskec_password'] == data.password) {
                        var objDataSession = {
                            se_us_id: results[0]['poskec_id'],
                            se_tipe: 5,
                            se_token: data.token,
                            se_api_key: data.apikey,
                            se_expired_at: dateFormat(new Date(new Date().getTime() + (30 * 24 * 3600 * 1000)), "yyyy-mm-dd HH:MM:ss"),
                            se_created_at: dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
                        };

                        var objResponse = {
                            result: 'true',
                            message: 'Login berhasil',
                            nama: results[0]['poskec_nama'],
                            posko_id: results[0]['poskec_id'],
                            posko: results[0]['poskec_nama_posko'],
                            nomor_posko: ("00" + (results[0]['poskec_id'] * 1)).slice(-3),
                            kec_id: results[0]['poskec_kec_id'],
                            kategori: results[0]['poskec_kategori'],
                            kecamatan: objKecamatan[results[0]['poskec_kec_id']]['kec_nama'],
                            tipe: 5,
                            token: data.token,
                            apikey: data.apikey
                        };
                        var sql2 = `DELETE FROM user_session WHERE se_us_id =  ${results[0]['poskec_id']}`;
                        var sql3 = `INSERT INTO user_session (se_us_id, se_tipe, se_token, se_api_key, se_created_at, se_expired_at) VALUES (${objDataSession.se_us_id},${objDataSession.se_tipe},'${objDataSession.se_token}','${objDataSession.se_api_key}','${objDataSession.se_created_at}','${objDataSession.se_expired_at}')`;

                        pool.query(sql2, function(error, results, fields) {
                            if (error) {
                                console.log(error)
                            } else {
                                console.log(results)
                                pool.query(sql3, function(error, results, fields) {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(results)
                                    }
                                });
                            }
                        });

                        res.status(200).send(objResponse)
                    } else {
                        res.status(200).send({
                            result: 'false',
                            message: 'Username atau password salah'
                        })
                    }
                } else {
                    res.status(200).send({
                        result: 'false',
                        message: 'Username atau password salah'
                    })
                }
            }
        });
    }
};

exports.login_relawan = function(req, res) {
    var data = {
        nik: req.body.username,
        password: req.body.password,
        token: uuid.v4().replace(/\-/g, ''),
        apikey: uuid.v4().replace(/\-/g, '')
    };
    if (isEmpty(data).value) {
        res.status(200).send({
            result: 'false',
            message: 'Data tidak lengkap',
            data: isEmpty(data).data
        })
    } else {
        var sql = 'SELECT * FROM user_relawan INNER JOIN posko ON user_relawan.ur_pos_id=posko.pos_id WHERE user_relawan.ur_nik = "' + data.nik + '" AND user_relawan.ur_tipe IN("1", "2")';
        pool.query(sql, function(error, results, fields) {
            if (error) {
                res.status(200).send({
                    result: 'false',
                    message: 'Server Error'
                })
            } else {
                if (results.length == 1) {
                    if (results[0]['ur_password'] == data.password) {
                        var objDataSession = {
                            se_us_id: results[0]['ur_id'],
                            se_tipe: results[0]['ur_tipe'],
                            se_token: data.token,
                            se_api_key: data.apikey,
                            se_expired_at: dateFormat(new Date(new Date().getTime() + (30 * 24 * 3600 * 1000)), "yyyy-mm-dd HH:MM:ss"),
                            se_created_at: dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
                        };

                        var objResponse = {
                            result: 'true',
                            message: 'Login berhasil',
                            nama: results[0]['ur_nama'],
                            posko_id: results[0]['ur_pos_id'],
                            posko: results[0]['pos_nama'],
                            nomor_posko: results[0]['pos_nomor'],
                            kec_id: results[0]['ur_kec_id'],
                            kecamatan: objKecamatan[results[0]['ur_kec_id']]['kec_nama'],
                            kel_id: results[0]['ur_kel_id'],
                            kelurahan: objKelurahan[results[0]['ur_kel_id']]['kel_nama'],
                            tipe: results[0]['ur_tipe'],
                            token: data.token,
                            apikey: data.apikey
                        };
                        var sql2 = `DELETE FROM user_session WHERE se_us_id =  ${results[0]['ur_id']}`;
                        var sql3 = `INSERT INTO user_session (se_us_id, se_tipe, se_token, se_api_key, se_created_at, se_expired_at) VALUES (${objDataSession.se_us_id},${objDataSession.se_tipe},'${objDataSession.se_token}','${objDataSession.se_api_key}','${objDataSession.se_created_at}','${objDataSession.se_expired_at}')`;

                        pool.query(sql2, function(error, results, fields) {
                            if (error) {
                                console.log(error)
                            } else {
                                console.log(results)
                                pool.query(sql3, function(error, results, fields) {
                                    if (error) {
                                        console.log(error)
                                    } else {
                                        console.log(results)
                                    }
                                });
                            }
                        });

                        res.status(200).send(objResponse)
                    } else {
                        res.status(200).send({
                            result: 'false',
                            message: 'Username atau password salah'
                        })
                    }
                } else {
                    res.status(200).send({
                        result: 'false',
                        message: 'Username atau password salah'
                    })
                }
            }
        });
    }
};

var isEmpty = function(obj) {
    var arr = Object.keys(obj).filter((head) => {
        return (obj[head] === null || obj[head] === undefined || obj[head] === "");
    })
    if (arr.length > 0) return {
        value: true,
        data: arr
    };
    else return {
        value: false,
        data: arr
    };
}

var authorize = function(req, table, primary, callback) {
    var now = dateFormat(funGetTime(), "yyyy-mm-d HH:MM:ss")
    var token = req.body.token;
    var apikey = req.body.apikey;
    pool.query(`SELECT * FROM user_session INNER JOIN ${table} ON user_session.se_us_id=${primary} WHERE se_token="${token}" AND se_api_key="${apikey}"`, function(error, results, fields) {
        if (error) {
            console.log(error)
            callback({
                result: 'false',
                message: error.toString()
            });
        } else {

            if (results.length == 1) {
                var dataResult = results[0]
                if (new Date(results[0]['se_expired_at']).getTime() < new Date().getTime()) {
                    pool.query(`DELETE FROM user_session WHERE se_token = "${token}" AND se_api_key = "${apikey}"  `, function(error, results, fields) {
                        if (error) {
                            console.log(error)
                            callback({
                                result: 'false',
                                message: 'Server Error'
                            });
                        } else {
                            callback({
                                result: 'false',
                                message: 'Session Expired'
                            });
                        }
                    });
                } else {
                    pool.query(`UPDATE user_session SET se_expired_at='${dateFormat(new Date(new Date().getTime() + (30 * 24 * 3600 * 1000)), "yyyy-mm-dd HH:MM:ss")}' WHERE se_id=${results[0]['se_id']} `, function(error, results, fields) {
                        if (error) {
                            console.log(error)
                            callback({
                                result: 'false',
                                message: 'Server Error'
                            });
                        } else {
                            callback({
                                result: 'true',
                                message: 'Add Session',
                                data: dataResult
                            });
                        }
                    });
                }
            } else {
                callback({
                    result: 'false',
                    message: 'User Not Found'
                });
            }
        }
    });
}

var createSqlInsert = function(table, data) {
    var head = Object.keys(data).map((key) => {
        return key
    }).join(',')
    var value = Object.keys(data).map((key) => {
        return "'" + data[key] + "'"
    }).join(',')
    return `INSERT INTO ${table} ( ${head} ) VALUES ( ${value} )`;
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

var getKecamatan = function() {
    pool.query('SELECT * FROM kecamatan', function(error, results, fields) {
        if (error) {
            console.log(error)
            return {};
        } else {
            objKecamatan = results.reduce((old, obj) => {
                old[obj.kec_id] = obj;
                return old;
            }, {})
        }
    });
}
var getKelurahan = function() {
    pool.query('SELECT * FROM kelurahan', function(error, results, fields) {
        if (error) {
            console.log(error)
            return {};
        } else {
            objKelurahan = results.reduce((old, obj) => {
                old[obj.kel_id] = obj;
                return old;
            }, {})
        }
    });
}

getKecamatan();
getKelurahan();