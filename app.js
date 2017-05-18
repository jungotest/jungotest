var express = require('express');
var bodyParser = require('body-parser');
var service = express();
var fileUpload = require('express-fileupload');
var request = require('request');
var sha1 = require('sha1');

service.set("port", process.env.PORT || 3000);
service.use(bodyParser.json());
service.use(fileUpload());

service.post("/",function(req, res){
    var tStart = (new Date()).getTime();
    var processor = new ShaProcessor(req,res,tStart);
    processor.Process();
});

service.listen(service.get('port'), function(){
    console.log( "jungo run on http://localhost:" + service.get("port"));
});

function ShaProcessor(req, res, startTime, bulbUrl="http://88.99.174.234:9090/"){
    var resultList =[];
    var requestData =[];
    var reqCount;
    
    this.Process= function(){
        if(req.files){
            reqCount=1;
            requestData.push({name:req.files.file.name, data:req.files.file.data});
            getSha1();
        }
        else{
            reqCount = req.body.length;
            req.body.forEach(function(item){
                var fileName =item.replace(/^.*[\\\/]/, '');
                var options = { method: 'GET', url: item, timeout:10000};
                request(options, function (error, response, body) {
                    if (error){
                        addHeader();
                        switch(error.code){
                            case "ETIMEDOUT":
                                res.status(504).send('ETIMEDOUT');
                                break;
                            default:
                                res.status(404).send(error.code);
                                break;
                        }
                    }
                    else{
                        requestData.push({name:fileName, data:body});
                        if(requestData.length==req.body.length)
                            getSha1();
                    }
                });
            });
        }
    }

    getSha1 = function(){
            requestData.forEach(function(item){
                var options = { method: 'POST',
                    url: bulbUrl,
                    headers: 
                        {'cache-control': 'no-cache',
                        'content-type': 'multipart/form-data' },
                    formData: 
                        { file: 
                            { value: item.data,
                                options: { filename: item.name, contentType: null }
                            } 
                        }, 
                    timeout:5000
                };

                request(options, function (error, response, body) {
                    if (error){
                        addHeader();
                        switch(error.code){
                            case "ETIMEDOUT":
                                res.status(504).send('ETIMEDOUT');
                                break;
                            default:
                                res.status(404).send(error.code);
                                break;
                        }
                    }
                    else{
                        resultList.push(sha1(sha1(item.data)+body))
                        if(resultList.length==reqCount){
                            addHeader();
                            res.json(resultList);
                        }
                    }
                });
            });
        };

        function addHeader(){
            var workTime =(new Date()).getTime() - startTime;
            res.header('X-RESPONSE-TIME' , workTime);
        }
    };



