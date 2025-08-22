import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { fetchDepartments, Department } from "@/lib/departments";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["doctor", "front-desk", "nurse"]),
  departmentId: z.string().optional(),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { role: "nurse", departmentId: "" },
  });

  const role = watch("role");

  // Fetch departments when component mounts
  useEffect(() => {
    const loadDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const deps = await fetchDepartments();
        setDepartments(deps);
      } catch (error) {
        console.error("Failed to load departments:", error);
      } finally {
        setIsLoadingDepartments(false);
      }
    };

    loadDepartments();
  }, []);

  const onSubmit = async (values: SignupFormValues) => {
    setServerError(null);
    
    // Custom validation for doctors
    if (values.role === "doctor" && !values.departmentId) {
      setServerError("Doctors must select a department");
      return;
    }
    
    try {
      await signUp(values.email, values.password, values.name, values.role, values.departmentId);
      setUserEmail(values.email);
      setSignupSuccess(true);
    } catch (error: any) {
      setServerError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="Enter your full name" {...register("name")} />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="doctor@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Role</Label>
        <RadioGroup
          value={role}
          onValueChange={(val) => {
            setValue("role", val as "doctor" | "front-desk" | "nurse");
            // Clear department if switching to front-desk or nurse
            if (val === "front-desk" || val === "nurse") {
              setValue("departmentId", "");
            }
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="doctor" id="doctor" />
            <Label htmlFor="doctor">Doctor</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="nurse" id="nurse" />
            <Label htmlFor="nurse">Nurse</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="front-desk" id="front-desk" />
            <Label htmlFor="front-desk">Front Desk Staff</Label>
          </div>
        </RadioGroup>
        <input type="hidden" {...register("role")}/>
        {errors.role && (
          <p className="text-sm text-red-500">{errors.role.message}</p>
        )}
      </div>

      {/* Department Selection for Doctors */}
      {role === "doctor" && (
        <div className="space-y-2">
          <Label htmlFor="department">
            Department <span className="text-red-500">*</span>
          </Label>
          {isLoadingDepartments ? (
            <p className="text-sm text-gray-500">Loading departments...</p>
          ) : departments.length > 0 ? (
            <Select value={watch("departmentId")} onValueChange={(value) => setValue("departmentId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-gray-500">No departments available</p>
          )}
          <p className="text-xs text-gray-500">
            Select the department you will be working in
          </p>
          {errors.departmentId && (
            <p className="text-sm text-red-500">{errors.departmentId.message}</p>
          )}
        </div>
      )}

      {serverError && (
        <p className="text-sm text-red-500" role="alert">
          {serverError}
        </p>
      )}
      
      {signupSuccess ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-green-600 text-4xl mb-2">🎉</div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Account Created Successfully!
            </h3>
            <p className="text-green-700 text-sm mb-4">
              We've sent a confirmation email to <strong>{userEmail}</strong>
            </p>
            <p className="text-green-600 text-xs">
              Please check your email and click the confirmation link to activate your account.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
            <Button 
              onClick={() => {
                setSignupSuccess(false);
                setUserEmail('');
              }} 
              className="w-full"
              variant="ghost"
            >
              Create Another Account
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      )}
    </form>
  );
}
