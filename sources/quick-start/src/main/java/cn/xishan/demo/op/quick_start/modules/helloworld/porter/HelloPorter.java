package cn.xishan.demo.op.quick_start.modules.helloworld.porter;

import cn.xishan.oftenporter.porter.core.annotation.PortIn;
import cn.xishan.oftenporter.porter.core.base.WObject;

/**
 * @author Created by https://github.com/CLovinr on 2017/10/21.
 */
@PortIn
public class HelloPorter
{
    @PortIn
    public String say()
    {
        return "Hello World!";
    }

    @PortIn(nece = {"words"})
    public String saySth(WObject wObject)
    {
        String words = wObject.fnOf(0);
        return "You said:" + words;
    }
}
