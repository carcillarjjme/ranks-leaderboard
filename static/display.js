/*const pallete = [
    "rgb(36, 37, 130)",
    "rgb(85, 61, 103)", 
    "rgb(246, 76, 114)",
    rgb(153, 115, 142)",
    "rgb(47, 47, 162)"
];*/


function get_bar_chart(data_structure, pallete,bar_thickness,chart_title){

    //get names from the data_structure
    const labels = data_structure.map((row) => row["lbl"]);
 
    //get sections
    const sections = data_structure.map((row) => row["sec"]);

    //get unique section names
    const section_list = [... new Set(sections)].sort();

    //get scores from the data_structure
    const scores = data_structure.map((row) => row["x"]);
    
    //create colormap for each section
    const colorscale = get_colors_alpha(section_list.length,pallete);
    const colormap = {}
    for (let i = 0; i < section_list.length; i++){
        let sec = section_list[i];
        colormap[sec] = colorscale[i];
    }

    const backColors = sections.map(sec => colormap[sec]);
    //const sectionNames = section_list;

    const data = {
        labels: labels,
        datasets: [
            {
                label: 'Dataset 1',
                data: data_structure,
                parsing: {
                    yAxisKey: "x",
                },
                drawBorder: true,
                borderColor: backColors,
                backgroundColor: backColors,
                barThickness: "flex",  // number (pixels) or use 'flex'
                maxBarThickness: bar_thickness, // number (pixels)
                barPercentage: 0.98,
                categoryPercentage: 1.0,
                borderRadius: 10,
                //borderSkipped: true, //change this to false to set all corners to borderRadius
            }
        ]
    };

    const changeBackColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
        const {ctx} = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || '#99ffff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
        }
    };

    const config = {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',
            // Elements options apply to all of the options unless overridden in a dataset
            // In this case, we are setting the border of each horizontal bar to be 2px wide
            elements: {
                bar: {
                    borderWidth: 2,
                }
            },
            scales: {
                y: {
                    grid: {
                        color: '#f64c72',
                    },
                    ticks: {
                        color: 'white',
                    }
                },
                x: {
                    grid: {
                        display: false,
                        color: 'red',
                    },
                    ticks: {
                        color: 'white',
                    },
                    title: {
                        display: true,
                        text: "Score",
                        color: "white",

                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                    position: "top",
                    labels: {
                        color: "white",
                    },
                },
                tooltip:{
                    callbacks: {
                        label: function(tooltipItem) {
                            return  tooltipItem.raw.sec + " - " +tooltipItem.parsed.x.toFixed(2);
                        },
                        footer: function(context){
                            const individual_score = context[0].raw.x;
                            const {rank,num_unique} = dense_rank(scores,individual_score);
                            const num_same = count_same(scores,individual_score);
                            if (num_same > 1){
                                const num_tie = num_same - 1;
                                return `Rank ${rank} of ${num_unique}\n(Tied with ${num_tie} more ${num_tie > 1? "entries": "entry"})`
                            }
                            return `Rank ${rank} of ${num_unique}`
                        }
                    },
                    displayColors: false,
                },
                title: {
                    display: true,
                    text: chart_title,
                    color: "white",
                    size: 20,
                    weight: "bold",
                },
                customCanvasBackgroundColor: {
                    color: 'rgb(36, 37, 130)',
                }
            },
        },
        plugins: [changeBackColor],
    };
    return config
}


function get_histogram(data_structure, pallete,bar_percentage,chart_title){
    const sections = Object.keys(data_structure.freq);

    //create colormap for each section
    const colorscale = get_colors_alpha(sections.length,pallete);
    const colormap = {}
    for (let i = 0; i < sections.length; i++){
        let sec = sections[i];
        colormap[sec] = colorscale[i];
    }
    const datasets = []
    sections.forEach((section,index) => {
        const color = colormap[section];
        const frequencies = data_structure.freq[section];
        const dataset = {
            label: section,
            data: frequencies,
            backgroundColor: color,
            barPercentage: bar_percentage,
            categoryPercentage: 1.0,
        }
        datasets.push(dataset);
    });
    
    const data = {labels:data_structure.bins,datasets:datasets};

    const changeBackColor = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
        const {ctx} = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || '#99ffff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
        }
    };


    const config = {
        type: 'bar',
        data: data,
        plugins: [changeBackColor],
        options: {
            plugins: {
                title: {
                    display: true,
                    text: chart_title,
                    color: "white",
                    size: 20,
                    weight: "bold",
                },
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        color: "white",
                    },
                },
                customCanvasBackgroundColor: {
                    color: 'rgb(36, 37, 130)',
                },
            },
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    grid: {
                        display: true,
                        color: "#f64c72",
                    },
                    ticks: {
                        color: 'white',
                    },
                    title: {
                        display: true,
                        text: "Score",
                        color: "white",
                    },
                },
                y: {
                    stacked: true,
                    grid: {
                        display: true,
                        color: "#f64c72",
                    },
                    ticks: {
                        color: 'white',
                    },
                    title: {
                        display: true,
                        text: "Counts",
                        color: "white",
                    },
                }
            }
        }
    };

    return config
}


$("#chart_area").scroll(function(){
    const maxscroll = $(this).prop("scrollHeight")- $(this).innerHeight();
    const hide_threshold = 0.99;
    const hide_completely = 0.98;

    let val = $(this).scrollTop();
    let ratio = val < maxscroll ? val/maxscroll : 1;

    const MAX_SHADOW = 40;
    const MIN_SHADOW = 20;
    let shadowsize = Math.floor((MAX_SHADOW - MIN_SHADOW)* (1-ratio) + MIN_SHADOW);
    
    const colorscale = get_colors_alpha(255, ["rgba(255,255,255,1)", "rgba(246,76,114,1)"]);
    let color = colorscale[Math.floor(255*ratio)];

    $(this).css("box-shadow",`2px 2px ${shadowsize}px ${color}`);
})