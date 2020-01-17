
let axios = require('axios');
let urllib = require('url');
let cheerio = require('cheerio');
const fs = require('fs');
let puppeteer = require('puppeteer');
let {fsWrite,fsRead,fsDir} = require('./lcfs');

let debugOptions = {
    //设置视窗的宽高
    defaultViewport:{
        width:1400,
        height:800
    },
    //设置为有界面，如果为true，即为无界面
    headless:false,
    //设置放慢每个步骤的毫秒数
    slowMo:250,
    timeout:0
}
let options={headless:true};


let count = 1;
let url = "http://www.mangabz.com/";
let httpUrl = "http://www.mangabz.com/234bz/";
let hostUrl = "http://www.mangabz.com/manga-list-31-0-10-p1/"
let chapterList = [];
//将延迟函数封装成promise对象
function delayToLoad(milliSecondes){
    return new Promise(function(resolve,reject){
        setTimeout(function(){
            resolve("成功执行延迟函数，延迟："+milliSecondes)
        },milliSecondes)
    })
}

async function getPageData() {
   let pageHtml = await axios.get(hostUrl);
   $ = cheerio.load(pageHtml.data,{decodeEntities: false});
   let browser = await puppeteer.launch(debugOptions);
   let page = await browser.newPage();   
  
// 单个漫画下载
/*********************************************************/ 
//    fsDir("./comics/"+"鬼滅之刃");
   await getChaptersList("http://www.mangabz.com/73bz/","鬼滅之刃");
/*********************************************************/ 
    
    // await getCategoryList(hostUrl);



   async function getCategoryList(url){
    ////获得不同分类下的漫画列表getCategoryList
   await page.goto(url);
    $('.mh-item>a').each(async(item,i)=>{
       let comicUrl = $('div.mh-item>a').eq(item).attr('href');
       comicUrl = urllib.resolve(url,comicUrl);
       //漫画文件夹名称
       let comic = $('div.mh-item-detali>h2 a').eq(item).attr('title');
       comic.trim();
       fsDir("./comics/"+comic);
       
   /*
   下载入口
   漫画所有章节下载`
   */
  await delayToLoad(300000*(item+1));
   let chapterList = await getChaptersList(comicUrl,comic);
      // 序列化所有章节list
      chapterListJson = JSON.stringify(chapterList, null, 2);

      //循环下载每个章节里的图片
      chapterList.forEach(async(item,index)=>{
          //延迟函数,设定每个章节延迟x秒后加载
          await delayToLoad(4500*(index+1));
          console.log(item.url+'#ipg2');
        
        console.log(urlArr);
          // 先下载章节名称
          fsDir("./comics/"+comic+"/"+item.chapter);
          //再下载章节内内容
          await getMhImages(item.url+'#ipg2',comic,item.chapter);
      })
  
      /*指定单个章节下载*/
      // fsDir("./comics/"+comic+"/"+"第8話");
      // await getMhImages("http://www.mangabz.com/m15903/"+'#ipg2',comic,"第8話");
  
   });
  
   }
 

//获取所有的连载章节
async function getChaptersList(httpUrl,comic){
    console.log("--------开始下载"+comic+"！-----------");
    
    let pageHtml = await axios.get(httpUrl);
    $ = cheerio.load(pageHtml.data,{decodeEntities: false});
    //拿到连载和番外等列表的长度
    //根据列表分类循环拿到分类下的li数据 
    let num = 1;
    let tabLength = $('div.detail-list-form-con a').length;
    let page = await browser.newPage();      
    await page.goto(httpUrl);
    let chapterList = [];
        // let div =  $("[id^='detail-list-select-']");
       
    // 接收获取到的分类
    $('div.detail-list-form-con a').each(async(item,i)=> {
        let chapterUrl = $(i).attr('href');
        chapterUrl = urllib.resolve(url,chapterUrl);
        //获取text文本数据但不包括子元素的文本
        //获取列表里显示的章节名
        let chapterNumber = $(i).children()[0].prev.data;
        //获取列表里显示的每章总页数
        let totalPage = $(i).find('span').text();
        // mhImages = JSON.stringify(mhImages, null, 2);
        let obj = {
            url: chapterUrl.trim(),
            chapter:chapterNumber.trim(),
            pages:totalPage.trim()
        };
        num++;
        chapterList.push(obj);

        if(num == tabLength+1){
            page.close();
            return chapterList;
        }
       
    })
    let chapters = chapterList;
    chapterList = [];
     //循环下载每个章节里的图片
    chapters.forEach(async(item,index)=>{
    //延迟函数,设定每个章节延迟x秒后加载
    await delayToLoad(6000*(index+1));
    //请求的第一,第二url,分别放置前1,2页和3-最后一页的图片地址
    let urlArr = [
        item.url, item.url+"#ipg2"
    ];
   
    // 先下载章节名称
    // fsDir("./comics/"+comic+"/"+item.chapter);
    
    //再下载章节内内容
 await downLoadImages(urlArr,comic,item.chapter);
})
    // return chapters;
  }

async function downLoadImages(urlArr,comic,chapter){
    await getMhImages(urlArr);
    // resultJs.forEach(async(item,index) => {
    //         console.log(item);
    //         let reg = /(\d*)?_(\d*)?/;
    //         let fileName = reg.exec(item);
    //         //   downLoad(item,fileName,comic,chapter);
    //           if(index+1 == resultJs.length){
    //             console.log("--------"+chapter+"下载完成！-----------");
    //             page.close();
    //         }
    //     });

}

//获得每章节里的图片
async function getMhImages(urlArr){
    let resultJs = [];
    let pageDetalList = [];
    outPoint:
    for(let i=0;i<2;i++){
        await delayToLoad(5000*(i+1));
        console.log("i:",i,urlArr[i]);
        let pageHtml = await axios.get(urlArr[i]);
        $ = cheerio.load(pageHtml.data,{decodeEntities: false});
        let page = await browser.newPage();
        let reg = [];
        // 网站图片请求的js语句;
        await page.setRequestInterception(true);
            //监听请求事件，并对请求进行拦截
        page.on('request', interceptedRequest => {
                //通过URL模块对请求的地址进行解析
                let urlObj = urllib.parse(interceptedRequest.url());
                if (urlObj.pathname.indexOf("galileo")!=-1){
                    //如果是广告请求，那么就放弃当次请求
                    interceptedRequest.abort();
                }else if(urlObj.pathname.indexOf("chapterimage")!=-1){
                    reg.push(urlObj.href);
                    interceptedRequest.continue();
                }else{
                    interceptedRequest.continue();
                }
            });
        
        await page.goto(urlArr[i]);
        let pageJsDetail =  await page.goto(reg[0]);
        if(pageJsDetail!=undefined){
             let ImgPagesJS = await page.$eval('pre',(element)=>{
                let text = element.innerText;
                return eval(text);
            }); 
            pageDetalList.push(ImgPagesJS);
            page.close();
            if(i==1){
                // reduce可以把二维数组转化为一维数组
                resultJs = pageDetalList.reduce((pre,cur)=>{
                    return pre.concat(cur);
                },[]);
                console.log("resultJs:",resultJs);
                return resultJs;
            }
        }else{
            continue outPoint;
        }
        
        if(i==0){
            continue outPoint;
        }

    /*******************************************************************/
    // let pageHtml = await axios.get(url);
    // $ = cheerio.load(pageHtml.data,{decodeEntities: false});
    // let page = await browser.newPage();
    // let reg = [];
    //  // 网站图片请求的js语句;
    // await page.setRequestInterception(true);
    //     //监听请求事件，并对请求进行拦截
    //  page.on('request', interceptedRequest => {
    //         //通过URL模块对请求的地址进行解析
    //         let urlObj = urllib.parse(interceptedRequest.url());
    //         if (urlObj.pathname.indexOf("galileo")!=-1){
    //             //如果是广告请求，那么就放弃当次请求
    //             interceptedRequest.abort();
    //         }else if(urlObj.pathname.indexOf("chapterimage")!=-1){
    //             let count=0;
    //             count++;
    //             reg.push(urlObj.href);
    //             interceptedRequest.continue();
    //         }else{
    //             interceptedRequest.continue();
    //         }
    //     });
    
    // await page.goto(url);
    // /*
    // *图片的地址数据放在chapterfun.ashx里
    // *chapterfun.ashx要先运行这串代码才能获得图片地址路径
    // */ 
    // await page.goto(reg[0]);
    // let ImgPagesJS = await page.$eval('pre',(element)=>{
    //     let text = element.innerText;
    //     return eval(text);
    // }); 
    //     let pageDetalList = [];
    //     pageDetalList.push(ImgPagesJS);
    //     console.log("pageDetalList:",pageDetalList);
    //     ImgPagesJS.forEach((item,index) => {
    //         let reg = /(\d*)?_(\d*)?/;
    //         let fileName = reg.exec(item);
    //         //   downLoad(item,fileName,comic,chapter);
    //           if(index+1 == ImgPagesJS.length){
    //             console.log("--------"+chapter+"下载完成！-----------");
    //             page.close();
    //         }
    //     });

    // return ImgPagesJS;
 /*******************************************************************/
    }
    // pageDetalList.forEach((item,index) => {
    //     // console.log(item);
    //         let reg = /(\d*)?_(\d*)?/;
    //         let fileName = reg.exec(item);
    //         //   downLoad(item,fileName,comic,chapter);
    //           if(index+1 == pageDetalList.length){
    //             console.log("--------"+chapter+"下载完成！-----------");
    //             page.close();
    //         }
    //     });
 }

async function downLoad(chapterImgUrl,imagesName,comic,chapter){
    axios.get(chapterImgUrl, {responseType:'stream'}).then(function(res){
        let ws = fs.createWriteStream('./comics/'+comic+'/'+chapter+'/'+imagesName[0]+".jpg");
        res.data.pipe(ws);      
    });
    console.log(imagesName[0]+"download ok!");
}

}
getPageData();


