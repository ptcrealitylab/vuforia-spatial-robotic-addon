# Understanding and Development of Motion tool

The Motion Tool is a [VST Tool]() that allows for path planning and realtime motion visualization.
It is built with HTML and Javascript and uses Node.js in order to manage all the files and dependencies.

## Getting Started

The file index.html will be rendered on the VST once the tool is activated. 
This HTML file will trigger the Javascript file js/index.js that will start the code for the Motion Tool.

The Motion Tool has two main characteristics:

* It is a **3D tool**. If you have explored the basic VST tools, they are mostly 2D HTML windows. The Motion Tool is a 3D tool. 
It makes use of THREE.js to render its contents onto the environment.
* It is a **full screen tool**. The basic VST tools often get attached to an object as a 2D window and don't take the entire screen when rendered. 
The motion tool is a full screen tool, it takes up all the device screen when rendered.

## Initialization

The Motion tool will be attached to an object (for example, a robot). When your device detects the object in the environment, it will automatically load the Motion tool.
You can see some screenshots of the Motion Tool here: [Motion Tool readme file](motionTool.md).

The index.js file is the starting point for the Motion Tool.
The first object generated is the mainUI containing the UI for the tool:

```
const mainUI = new MainUI();
```

Several callbacks are set up for the mainUI.

The second object is the KineticAR view:

```
const arScene = new ARScene();
```

## Authors

* **[Anna Fuste](https://github.com/afustePTC)**

See also the list of [contributors](https://github.com/ptcrealitylab/vuforia-spatial-robotic-addon/graphs/contributors) who participated in this project.

## License

This project is licensed under the MPL 2.0 License - see the [LICENSE](../../../../LICENSE) file for details

## Acknowledgments

* Hat tip to anyone whose code was used
* We thank Robb Stark for being on our wall watching all of us during the development process

