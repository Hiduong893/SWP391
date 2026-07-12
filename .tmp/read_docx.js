const mammoth = require('mammoth');

const filePath = process.argv[2];
mammoth.extractRawText({path: filePath})
    .then(function(result){
        const text = result.value; 
        console.log(text);
    })
    .done();
