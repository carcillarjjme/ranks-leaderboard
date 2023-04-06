function ranker(x){
    //adds a proper suffix to a rank
    let last_two = Number(x.toString().slice(-2));
    if ((last_two>10) && (last_two<20)){
        return x + "th"
    }
    let last = Number(x.toString().slice(-1));
    if (last === 1){
        return x + "st";
    } else if (last === 2){
        return x + "nd";
    } else if (last === 3){
        return x + "rd";
    } else {
        return x + "th";
    }
}

function count_same(list,x){
    return list.filter( val => val === x).length
}

function dense_rank(list,x){
    //returns rank (string) and number of unique values
    //this handles ties using a dense ranking method
    const unique = Array.from(new Set(list)).sort((a,b) => Number(a) - Number(b)).reverse();
    const num_unique = unique.length;
    const index = unique.indexOf(x);
    let rank = "Unranked";

    if (index !== -1) {
        rank = ranker(index + 1);
    }
    return {rank,num_unique}
}

function isNumeric(value) {
    //check if the string can be parsed into a number
    return /^-?\d+$/.test(value);
}

function getNumPages(lendata,dx){
    //get the number of pages for a given length
    //where dx is the number of entries per page
    var pages = Math.floor(lendata/dx);
    var excess = lendata - (pages*dx);
    if (excess>0){
        pages += 1;
    }
    return pages
}

function range(start,end,dx = 1){
    //simulate the python range function
    var list = [];
    var j = start;
    if (end>start){
        if (dx<0){
            return null;
        }
        while (j<end){
            list.push(j);
            j += dx;
        }
        return list;
    } else if (start>end){
        if (dx>0){
            return null;
        }
        while (j>end){
            list.push(j);
            j += dx;
        }
        return list;
    }
    return null;
}

function countTrueDict(dict){
    //count the number of true values in a boolean dict
    var count_true = 0;
    for (const [key,val] of Object.entries(dict)){
        if (val){
            count_true += 1;
        }
    }
    return count_true;
}

var Upload = function (file) {
    this.file = file;
};

Upload.prototype.getType = function() {
    return this.file.type;
};
Upload.prototype.getSize = function() {
    return this.file.size;
};
Upload.prototype.getName = function() {
    return this.file.name;
};
Upload.prototype.doUpload = function () {
    $("#progress-wrp").show()

    var that = this;
    var formData = new FormData();

    // add assoc key values, this will be posts values
    formData.append("file", this.file, this.getName());
    formData.append("upload_file", true);

    $.ajax({
        type: "POST",
        url: "script",
        xhr: function () {
            var myXhr = $.ajaxSettings.xhr();
            if (myXhr.upload) {
                myXhr.upload.addEventListener('progress', that.progressHandling, false);
            }
            return myXhr;
        },
        success: function (response) {
            console.log(response)
            setTimeout(function(){
                $("#progress-wrp").hide();
            },3000)
            // your callback here
        },
        error: function (error) {
            console.log(error)
            setTimeout(function(){
                $("#progress-wrp").hide();
            },3000)
            // handle error
        },
        async: true,
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        timeout: 60000
    });
};

Upload.prototype.progressHandling = function (event) {
    var percent = 0;
    var position = event.loaded || event.position;
    var total = event.total;
    var progress_bar_id = "#progress-wrp";
    if (event.lengthComputable) {
        percent = Math.ceil(position / total * 100);
    }
    // update progressbars classes so it fits your code
    $(progress_bar_id + " .progress-bar").css("width", +percent + "%");
    $(progress_bar_id + " .status").text(percent + "%");
};

function get_colors(numColors, startColor = '#FF0000', middleColor = '#00FF00', endColor = '#0000FF'){
    // Generate an array of colors using the chroma.js scale function
    const colorScale = chroma.scale([startColor, middleColor, endColor]).colors(numColors);
    return colorScale
}

function get_colors_alpha(numColors, colors) {
    const color_list = colors.map(color => chroma(color));
    const colorScale = chroma.scale(colors).colors(numColors);
    const rgbaColors = colorScale.map(color => chroma(color).rgba());
    const rgbaString = rgbaColors.map(rgba => `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3]})`);
    return rgbaString
}


function randrange(minval,maxval){
    return Math.floor(Math.random()*(maxval - minval)) + minval
}

function choose(list){
    let index = Math.floor(Math.floor(Math.random()*list.length));
    return list[index]
}
