let puppeteer = require('puppeteer');
let axios = require('axios')
let url = require('url')
let fs = require('fs')

let httpUrl = "https://sobooks.cc/";
(async function(){
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
    let options={headless:true}
    let browser = await puppeteer.launch(debugOptions);

    //将延迟函数封装成promise对象
    function lcWait(milliSecondes){
        return new Promise(function(resolve,reject){
            setTimeout(function(){
                resolve("成功执行延迟函数，延迟："+milliSecondes)
            },milliSecondes);
        })
    }
    async function getAllNum(){
       let page = await browser.newPage();
       await page.setRequestInterception(true);
        //监听请求事件，并对请求进行拦截
        page.on('request', interceptedRequest => {
            //通过URL模块对请求的地址进行解析
            let urlObj = url.parse(interceptedRequest.url());
            if (urlObj.hostname.indexOf("google")!=-1){
                //如果是谷歌的广告请求，那么就放弃当次请求，因为谷歌广告响应太慢
                interceptedRequest.abort();
            }else{
                interceptedRequest.continue();
            }
            
            
        });
       await page.goto(httpUrl);
       //设置选择器，获取总页数
       let pageNum = await  page.$eval(".pagination li:last-child span",(element)=>{
           let text = element.innerHTML;
           //console.log(text)
           text = text.substring(1,text.length-2).trim();
           return text;
       })
       page.close();
       return pageNum;
    }

    //let pageNum = await getAllNum()
    //console.log(pageNum)

    async function pageList(){
        let pageListUrl = "https://sobooks.cc/page/"+num;
        let page = await browser.newPage();
        await page.setRequestInterception(true);
        //监听请求事件，并对请求进行拦截
        page.on('request', interceptedRequest => {
            //通过URL模块对请求的地址进行解析
            let urlObj = url.parse(interceptedRequest.url());
            if (urlObj.hostname.indexOf("google")!=-1){
                //如果是谷歌的广告请求，那么就放弃当次请求，因为谷歌广告响应太慢
                interceptedRequest.abort();
            }else{
                interceptedRequest.continue();
            }
            
            
        });
        //访问列表页地址
        await page.goto(pageListUrl)
        let arrPage = await page.$$eval(".card .card-item .thumb-img>a",(elements)=>{
            let arr = [];
            elements.forEach((element,i)=>{
                var obj = {
                    href:element.getAttribute("href"),
                    title:element.getAttribute("title")
                }
                //console.log(obj.href)
               //console.log(obj.title)
                arr.push(obj) 
            })
            //console.log(arr)
            
            return arr;
        })

        page.close();
        //通过获取的数组的地址和标题去请求书籍的详情页
        getPageInfo(arrPage);
        

    }

    async function getPageInfo(arrPage){
        let pageObj = arrPage[count]
        let page = await browser.newPage();
        //截取谷歌请求
        await page.setRequestInterception(true);
        //监听请求事件，并对请求进行拦截
        page.on('request', interceptedRequest => {
            //通过URL模块对请求的地址进行解析
            let urlObj = url.parse(interceptedRequest.url());
            if (urlObj.hostname.indexOf("google")!=-1){
                //如果是谷歌的广告请求，那么就放弃当次请求，因为谷歌广告响应太慢
                //console.log(urlObj.hostname.indexOf("google"))
                interceptedRequest.abort();
            }else{
                interceptedRequest.continue();
            }
            
            
        });
        await page.goto(pageObj.href);
        let eleA = await page.$(".dltable tr:nth-child(3) a:last-child");
        let aHref =await eleA.getProperty('href');
        
        aHref = aHref._remoteObject.value;
        aHref = aHref.split('?url=')[1];
        let content = `{"title":"${pageObj.title}","href":"${aHref}"}---\n`;
        fs.writeFile('./bookList/book'+num+'.txt',content,{flag:"a"},function(){
            console.log("已将书"+count+"下载路径写入："+pageObj.title);
            count++;
            page.close();
            
            if(count==arrPage.length){
                //browser.close()
                count=0
                console.log("--------第"+num+"页下载链接收集完成！-----------")
                num++;
                pageList();
                
            }else{
                getPageInfo(arrPage);
            }
            
        })
        //console.log(aHref)
    }
    let num = 57;
    let count = 0;
    pageList()
    //getPageInfo({href:"https://sobooks.cc/books/14620.html",title:"abc"})  
})()

//目标：获取https://sobooks.cc/,所有书名和电子书的链接
//进入网站，获取整个网站列表页的页数



//获取列表页的所有链接


//进入每个电子书的详情页获取下载电子书的网盘地址


//将获取的数据保存到book.txt文档里