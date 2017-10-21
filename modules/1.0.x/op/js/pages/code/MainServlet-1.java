package cn.xishan.demo.op.quick_start.startup;

import cn.xishan.oftenporter.servlet.WMainServlet;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;

/**
 * @author Created by https://github.com/CLovinr on 2017/10/21.
 */
@WebServlet(urlPatterns = "/op-porter/*",loadOnStartup = 5)
public class MainServlet extends WMainServlet
{
    @Override
    public void init() throws ServletException
    {
        super.init();
        //TODO 在这里写代码
    }
}
