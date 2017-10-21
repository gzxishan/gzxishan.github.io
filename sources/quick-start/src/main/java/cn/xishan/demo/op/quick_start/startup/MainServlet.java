package cn.xishan.demo.op.quick_start.startup;

import cn.xishan.oftenporter.porter.core.init.PorterConf;
import cn.xishan.oftenporter.porter.core.util.PackageUtil;
import cn.xishan.oftenporter.servlet.WMainServlet;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;

/**
 * @author Created by https://github.com/CLovinr on 2017/10/21.
 */
@WebServlet(urlPatterns = "/op-porter/*", loadOnStartup = 5)//loadOnStartup:容器启动时被执行
public class MainServlet extends WMainServlet
{
    @Override
    public void init() throws ServletException
    {
        super.init();
        PorterConf porterConf = newPorterConf();
        porterConf.setContextName("1.0");//必须设置
        String pkg = PackageUtil.getPackageWithRelative(getClass(), "../modules", ".");
        porterConf.getSeekPackages().addPorters(pkg);
        startOne(porterConf);//启动
    }
}
